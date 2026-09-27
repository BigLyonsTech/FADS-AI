import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireHrAccess,
  syncUserHrOrgs,
  getOrgConfig,
  assertOrgWritable,
  hrWording,
} from "../../shared/hr.ts";
import { createHrAuditHelper, makeOwnRecordCheck } from "../../shared/hrBackend.ts";
import {
  validateFile,
  getExpiryStatus,
  DEFAULT_DOCUMENT_TYPES,
} from "../../shared/hrDocuments.ts";

// Organisation-isolated HR document operations. Every action requires the
// caller to hold an HR-authorised role in the target organisation.
//
// Actions:
//   list_documents          — documents for an employee (filters: status, type, search)
//   get_document           — single document
//   create_document        — create document metadata (validates file type/size)
//   update_document        — update metadata (not file or verification fields)
//   verify_document        — verify or reject a document
//   archive_document       — set status to archived
//   delete_document        — delete a document record
//   get_download_url       — create a time-limited signed URL for private file download
//   list_document_types    — all document types for the org
//   create/update/delete_document_type
//   get_expiring_documents — documents expiring within N days (for dashboard reminders)
//   seed_demo              — fictional demo document types and metadata (Demo mode only)
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    const svc = base44.asServiceRole;

    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    await syncUserHrOrgs(svc, user.id);
    await requireHrAccess(svc, user.id, organisation_id);
    const org = await getOrgConfig(svc, organisation_id);
    const wording = hrWording(org.type);

    const audit = createHrAuditHelper(svc, organisation_id, user);
    const ownRecord = makeOwnRecordCheck(organisation_id);

    // ---------------- list documents ----------------
    if (action === "list_documents") {
      const { employee_id, status, document_type_id, search } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      let docs = await svc.entities.EmployeeDocument.filter(
        { organisation_id, employee_id },
        "-upload_date",
        500
      );

      if (status) docs = docs.filter((d) => d.status === status);
      if (document_type_id)
        docs = docs.filter((d) => d.document_type_id === document_type_id);
      if (search) {
        const q = search.toLowerCase();
        docs = docs.filter(
          (d) =>
            (d.title || "").toLowerCase().includes(q) ||
            (d.description || "").toLowerCase().includes(q)
        );
      }

      const documentTypes = await svc.entities.DocumentType.filter({
        organisation_id,
      });

      const enriched = docs.map((d) => ({
        ...d,
        expiry_status: getExpiryStatus(d.expiry_date),
      }));

      return Response.json({
        documents: enriched,
        document_types: documentTypes,
        wording,
      });
    }

    // ---------------- get document ----------------
    if (action === "get_document") {
      const { document_id } = body;
      if (!document_id)
        return Response.json({ error: "Missing document_id" }, { status: 400 });

      const doc = await svc.entities.EmployeeDocument.get(document_id);
      if (!ownRecord(doc))
        return Response.json({ error: "Not found" }, { status: 404 });

      await audit(
        "hr.document_viewed",
        "EmployeeDocument",
        document_id,
        null,
        null
      );

      return Response.json({
        document: { ...doc, expiry_status: getExpiryStatus(doc.expiry_date) },
      });
    }

    // ---------------- create document ----------------
    if (action === "create_document") {
      assertOrgWritable(org);
      const {
        employee_id,
        document_type_id,
        title,
        description,
        upload_date,
        issue_date,
        expiry_date,
        status,
        confidentiality_level,
        file_uri,
        file_name,
        file_size,
        file_content_type,
        internal_notes,
        shared_with_employee,
      } = body;

      if (!employee_id || !title)
        return Response.json(
          { error: "employee_id and title are required" },
          { status: 400 }
        );

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      // Validate file type and size (server-side enforcement)
      if (file_name) {
        const check = validateFile(file_name, file_size);
        if (!check.valid) return Response.json({ error: check.error }, { status: 400 });
      }

      // Get document type for default confidentiality
      let docType = null;
      if (document_type_id) {
        docType = await svc.entities.DocumentType.get(document_type_id);
        if (!ownRecord(docType))
          return Response.json(
            { error: "Document type not found" },
            { status: 404 }
          );
      }

      // In Demo mode, never store real file URIs
      const actualFileUri =
        org.data_mode === "demo" ? null : file_uri || null;

      const rec = await svc.entities.EmployeeDocument.create({
        organisation_id,
        employee_id,
        document_type_id: document_type_id || null,
        document_type_name: docType?.name || null,
        title,
        description: description || null,
        upload_date: upload_date || new Date().toISOString().slice(0, 10),
        issue_date: issue_date || null,
        expiry_date: expiry_date || null,
        status: status || "current",
        confidentiality_level:
          confidentiality_level ||
          (docType?.is_confidential_default ? "confidential" : "internal"),
        verification_status: "pending",
        verifier_id: null,
        verifier_name: null,
        verification_date: null,
        verification_notes: null,
        file_uri: actualFileUri,
        file_name: file_name || null,
        file_size: file_size || null,
        file_content_type: file_content_type || null,
        internal_notes: internal_notes || null,
        shared_with_employee: shared_with_employee || false,
        data_mode: org.data_mode,
      });

      await audit(
        "hr.document_created",
        "EmployeeDocument",
        rec.id,
        null,
        { title, employee_id, has_file: !!actualFileUri }
      );
      return Response.json({ ok: true, id: rec.id });
    }

    // ---------------- update document ----------------
    if (action === "update_document") {
      assertOrgWritable(org);
      const { document_id, ...patch } = body;
      if (!document_id)
        return Response.json({ error: "Missing document_id" }, { status: 400 });

      const doc = await svc.entities.EmployeeDocument.get(document_id);
      if (!ownRecord(doc))
        return Response.json({ error: "Not found" }, { status: 404 });

      // Prevent updating file and verification fields here
      delete patch.document_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      delete patch.file_uri;
      delete patch.file_name;
      delete patch.file_size;
      delete patch.file_content_type;
      delete patch.verification_status;
      delete patch.verifier_id;
      delete patch.verifier_name;
      delete patch.verification_date;
      delete patch.verification_notes;

      const before = {
        title: doc.title,
        status: doc.status,
        expiry_date: doc.expiry_date,
        confidentiality_level: doc.confidentiality_level,
      };

      await svc.entities.EmployeeDocument.update(document_id, patch);
      await audit("hr.document_updated", "EmployeeDocument", document_id, before, patch);
      return Response.json({ ok: true });
    }

    // ---------------- verify document ----------------
    if (action === "verify_document") {
      assertOrgWritable(org);
      const { document_id, verification_status, verification_notes } = body;
      if (!document_id || !verification_status)
        return Response.json(
          { error: "document_id and verification_status are required" },
          { status: 400 }
        );

      if (!["verified", "rejected", "pending"].includes(verification_status)) {
        return Response.json(
          { error: "Invalid verification_status" },
          { status: 400 }
        );
      }

      const doc = await svc.entities.EmployeeDocument.get(document_id);
      if (!ownRecord(doc))
        return Response.json({ error: "Not found" }, { status: 404 });

      const before = { verification_status: doc.verification_status };
      const today = new Date().toISOString().slice(0, 10);

      await svc.entities.EmployeeDocument.update(document_id, {
        verification_status,
        verifier_id: user.id,
        verifier_name: user.full_name || user.email,
        verification_date: today,
        verification_notes: verification_notes || null,
      });

      await audit(
        "hr.document_verified",
        "EmployeeDocument",
        document_id,
        before,
        { verification_status, verifier: user.email }
      );
      return Response.json({ ok: true });
    }

    // ---------------- archive document ----------------
    if (action === "archive_document") {
      assertOrgWritable(org);
      const { document_id } = body;
      if (!document_id)
        return Response.json({ error: "Missing document_id" }, { status: 400 });

      const doc = await svc.entities.EmployeeDocument.get(document_id);
      if (!ownRecord(doc))
        return Response.json({ error: "Not found" }, { status: 404 });

      const before = { status: doc.status };
      await svc.entities.EmployeeDocument.update(document_id, {
        status: "archived",
      });
      await audit("hr.document_archived", "EmployeeDocument", document_id, before, {
        status: "archived",
      });
      return Response.json({ ok: true });
    }

    // ---------------- delete document ----------------
    if (action === "delete_document") {
      assertOrgWritable(org);
      const { document_id } = body;
      if (!document_id)
        return Response.json({ error: "Missing document_id" }, { status: 400 });

      const doc = await svc.entities.EmployeeDocument.get(document_id);
      if (!ownRecord(doc))
        return Response.json({ error: "Not found" }, { status: 404 });

      await svc.entities.EmployeeDocument.delete(document_id);
      await audit("hr.document_deleted", "EmployeeDocument", document_id, { title: doc.title }, null);
      return Response.json({ ok: true });
    }

    // ---------------- get download url ----------------
    if (action === "get_download_url") {
      const { document_id } = body;
      if (!document_id)
        return Response.json({ error: "Missing document_id" }, { status: 400 });

      const doc = await svc.entities.EmployeeDocument.get(document_id);
      if (!ownRecord(doc))
        return Response.json({ error: "Not found" }, { status: 404 });

      if (!doc.file_uri) {
        return Response.json(
          { error: "No file attached to this document" },
          { status: 400 }
        );
      }

      // Create a time-limited signed URL (5 minutes)
      const result = await svc.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.file_uri,
        expires_in: 300,
      });

      await audit("hr.document_downloaded", "EmployeeDocument", document_id, null, {
        file_name: doc.file_name,
      });

      return Response.json({ signed_url: result.signed_url });
    }

    // ---------------- document types ----------------
    if (action === "list_document_types") {
      const documentTypes = await svc.entities.DocumentType.filter({
        organisation_id,
      });
      return Response.json({ document_types: documentTypes });
    }

    if (action === "create_document_type") {
      assertOrgWritable(org);
      const {
        name,
        description,
        category,
        is_confidential_default,
        is_required_for_onboarding,
        has_expiry,
      } = body;
      if (!name || !category)
        return Response.json(
          { error: "name and category are required" },
          { status: 400 }
        );

      const rec = await svc.entities.DocumentType.create({
        organisation_id,
        name,
        description: description || null,
        category,
        is_confidential_default: is_confidential_default !== false,
        is_required_for_onboarding: is_required_for_onboarding || false,
        has_expiry: has_expiry || false,
        data_mode: org.data_mode,
      });
      await audit("hr.document_type_created", "DocumentType", rec.id, null, { name, category });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_document_type") {
      assertOrgWritable(org);
      const { document_type_id, ...patch } = body;
      if (!document_type_id)
        return Response.json({ error: "Missing document_type_id" }, { status: 400 });
      const rec = await svc.entities.DocumentType.get(document_type_id);
      if (!ownRecord(rec))
        return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.document_type_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      await svc.entities.DocumentType.update(document_type_id, patch);
      await audit("hr.document_type_updated", "DocumentType", document_type_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_document_type") {
      assertOrgWritable(org);
      const { document_type_id } = body;
      if (!document_type_id)
        return Response.json({ error: "Missing document_type_id" }, { status: 400 });
      const rec = await svc.entities.DocumentType.get(document_type_id);
      if (!ownRecord(rec))
        return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.DocumentType.delete(document_type_id);
      await audit("hr.document_type_deleted", "DocumentType", document_type_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- expiring documents ----------------
    if (action === "get_expiring_documents") {
      const { days = 30 } = body;
      const docs = await svc.entities.EmployeeDocument.filter(
        { organisation_id },
        "-expiry_date",
        500
      );

      const withExpiry = docs.filter(
        (d) => d.expiry_date && d.status !== "archived"
      );

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const expiring = withExpiry.filter((d) => {
        const exp = new Date(d.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
        return diffDays <= days;
      });

      // Enrich with employee names
      const employeeIds = [...new Set(expiring.map((d) => d.employee_id))];
      const employees = await Promise.all(
        employeeIds.map((id) =>
          svc.entities.Employee.get(id).catch(() => null)
        )
      );
      const empMap = Object.fromEntries(
        employees.filter(Boolean).map((e) => [e.id, e])
      );

      const enriched = expiring.map((d) => ({
        id: d.id,
        employee_id: d.employee_id,
        employee_name: empMap[d.employee_id]
          ? [empMap[d.employee_id].first_name, empMap[d.employee_id].last_name]
              .filter(Boolean)
              .join(" ")
          : null,
        title: d.title,
        document_type_name: d.document_type_name,
        expiry_date: d.expiry_date,
        status: d.status,
        expiry_status: getExpiryStatus(d.expiry_date),
      }));

      // Sort: expired first, then by expiry date ascending
      enriched.sort((a, b) => {
        if (a.expiry_status === "expired" && b.expiry_status !== "expired") return -1;
        if (a.expiry_status !== "expired" && b.expiry_status === "expired") return 1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });

      return Response.json({ documents: enriched });
    }

    // ---------------- seed demo ----------------
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json(
          { error: "Demo seed is only available in Demo mode" },
          { status: 400 }
        );
      }

      const existingTypes = await svc.entities.DocumentType.filter({
        organisation_id,
        data_mode: "demo",
      });
      if (existingTypes.length > 0) {
        return Response.json({ ok: true, message: "Demo data already seeded" });
      }

      // Create default document types
      const types = await svc.entities.DocumentType.bulkCreate(
        DEFAULT_DOCUMENT_TYPES.map((t) => ({
          organisation_id,
          name: t.name,
          description: t.description,
          category: t.category,
          is_confidential_default: t.is_confidential_default,
          is_required_for_onboarding: t.is_required_for_onboarding,
          has_expiry: t.has_expiry,
          data_mode: "demo",
        }))
      );

      // Create fictional document metadata for some employees (no real files)
      const employees = await svc.entities.Employee.filter({
        organisation_id,
        data_mode: "demo",
      });

      const today = new Date().toISOString().slice(0, 10);
      const futureDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
      };
      const pastDate = (days) => futureDate(-days);

      const demoDocs = [];
      // Give first 3 employees some documents
      for (let i = 0; i < Math.min(3, employees.length); i++) {
        const emp = employees[i];
        // Employment contract
        demoDocs.push({
          organisation_id,
          employee_id: emp.id,
          document_type_id: types[0].id,
          document_type_name: types[0].name,
          title: `${emp.first_name}'s Employment Contract`,
          description: "Signed employment contract",
          upload_date: emp.start_date || pastDate(60),
          issue_date: emp.start_date || pastDate(60),
          expiry_date: emp.contract_type === "fixed_term" ? futureDate(365) : null,
          status: "current",
          confidentiality_level: "confidential",
          verification_status: i === 0 ? "verified" : "pending",
          verifier_id: i === 0 ? user.id : null,
          verifier_name: i === 0 ? user.full_name || user.email : null,
          verification_date: i === 0 ? pastDate(55) : null,
          file_uri: null,
          file_name: null,
          file_size: null,
          file_content_type: null,
          data_mode: "demo",
        });
        // National ID (one expiring soon for the first employee)
        demoDocs.push({
          organisation_id,
          employee_id: emp.id,
          document_type_id: types[2].id,
          document_type_name: types[2].name,
          title: `${emp.first_name}'s National ID`,
          description: "National identification document",
          upload_date: emp.start_date || pastDate(60),
          issue_date: emp.start_date || pastDate(60),
          expiry_date: i === 0 ? futureDate(15) : futureDate(200),
          status: i === 0 ? "current" : "current",
          confidentiality_level: "restricted",
          verification_status: "pending",
          file_uri: null,
          file_name: null,
          file_size: null,
          file_content_type: null,
          data_mode: "demo",
        });
        // Policy acknowledgement
        demoDocs.push({
          organisation_id,
          employee_id: emp.id,
          document_type_id: types[6].id,
          document_type_name: types[6].name,
          title: "Employee Handbook Acknowledgement",
          description: "Signed acknowledgement of company policies",
          upload_date: emp.start_date || pastDate(60),
          issue_date: emp.start_date || pastDate(60),
          expiry_date: null,
          status: "current",
          confidentiality_level: "internal",
          verification_status: "verified",
          verifier_id: user.id,
          verifier_name: user.full_name || user.email,
          verification_date: pastDate(55),
          file_uri: null,
          file_name: null,
          file_size: null,
          file_content_type: null,
          data_mode: "demo",
        });
      }

      if (demoDocs.length > 0) {
        await svc.entities.EmployeeDocument.bulkCreate(demoDocs);
      }

      await audit("hr.documents_demo_seeded", "DocumentType", null, null, {
        types: types.length,
        documents: demoDocs.length,
      });
      return Response.json({
        ok: true,
        seeded: { document_types: types.length, documents: demoDocs.length },
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}