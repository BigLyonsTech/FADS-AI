import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Sparkles, Loader2, ChevronLeft, ChevronRight, Send, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { getCrmConfig, getContactTypeLabel } from "@/lib/crmWording";
import { getAnnouncementExamples, resolveAudienceContacts } from "@/lib/automationWording";
import { base44 } from "@/api/base44Client";

// Announcement wizard — a simple "tell a group of people something" flow
// for users who don't want to build a traditional CRM automation.
//
// 4 steps: WHAT → WHO → HOW → REVIEW & APPROVE
// Reuses: CRM contact types + groups (no duplicate audience database),
// Content Centre AI (generate_content) for per-channel message adaptation,
// and existing WhatsApp / Email / DM composers (opened by the parent).
//
// SAFETY: Nothing is sent from this dialog. On approve, the parent opens
// the existing composers sequentially — each with its own review step.
export default function AnnouncementDialog({
  open, onClose, orgType, contacts, orgs, leads, orgId, onApprove,
}) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [aiDraft, setAiDraft] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [audienceTypes, setAudienceTypes] = useState([]);
  const [audienceGroups, setAudienceGroups] = useState([]);
  const [channels, setChannels] = useState(["whatsapp"]);
  const [messages, setMessages] = useState({});
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState("");

  const crmConfig = getCrmConfig(orgType);
  const examples = getAnnouncementExamples(orgType);
  const groupOptions = useMemo(() => (orgs || []).map((o) => ({ value: o.id, label: o.name })), [orgs]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setTopic("");
      setAiDraft(null);
      setDrafting(false);
      setAudienceTypes([]);
      setAudienceGroups([]);
      setChannels(["whatsapp"]);
      setMessages({});
      setSelected({});
      setSearch("");
    }
  }, [open]);

  // Resolve + deduplicate audience from selected contact types and groups
  const audienceContacts = useMemo(() => {
    const typeContacts = resolveAudienceContacts(
      { audience_type: "contact_type", audience_values: audienceTypes },
      contacts || [], leads || []
    );
    const groupContacts = resolveAudienceContacts(
      { audience_type: "group", audience_values: audienceGroups },
      contacts || [], leads || []
    );
    const seen = new Set();
    return [...typeContacts, ...groupContacts].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [audienceTypes, audienceGroups, contacts, leads]);

  // Initialize messages + selection when entering step 4
  useEffect(() => {
    if (step === 4) {
      setMessages({
        whatsapp: aiDraft?.whatsapp || topic,
        email_subject: aiDraft?.email_subject || "Announcement from FADS",
        email_body: aiDraft?.email_body || topic,
        message: aiDraft?.short_message || topic,
      });
      const initial = {};
      audienceContacts.forEach((c) => { initial[c.id] = true; });
      setSelected(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggleArray = (arr, val) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  // Ask FADS to write the announcement (reuses Content Centre AI)
  const askFads = async () => {
    if (!topic.trim()) return;
    setDrafting(true);
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "generate_content",
        organisation_id: orgId,
        topic: topic.trim(),
        content_types: ["whatsapp", "email", "short_message"],
      });
      const pack = res.pack || {};
      setAiDraft(pack);
      // Pre-fill the topic with the WhatsApp version so the user sees the result
      if (pack.whatsapp) setTopic(pack.whatsapp);
    } catch (e) {
      // silent — user can write manually
    } finally {
      setDrafting(false);
    }
  };

  // Determine which channels each contact can receive
  const getContactChannels = (c) => {
    const available = [];
    if (channels.includes("whatsapp") && (c.phone || "").replace(/[^\d]/g, "") && c.status !== "inactive")
      available.push("whatsapp");
    if (channels.includes("email") && c.email && c.status !== "inactive")
      available.push("email");
    if (channels.includes("message") && c.status !== "inactive")
      available.push("message");
    return available;
  };

  // Filter by search (step 4)
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return audienceContacts;
    return audienceContacts.filter((c) =>
      `${c.first_name} ${c.last_name || ""} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceContacts, search]);

  const validSelected = useMemo(
    () => audienceContacts.filter((c) => selected[c.id] && getContactChannels(c).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audienceContacts, selected, channels]
  );

  const skippedSelected = useMemo(
    () => audienceContacts.filter((c) => selected[c.id] && getContactChannels(c).length === 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audienceContacts, selected, channels]
  );

  const toggleRecipient = (id) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  };

  const selectAll = () => {
    const next = {};
    audienceContacts.forEach((c) => {
      if (getContactChannels(c).length > 0) next[c.id] = true;
    });
    setSelected(next);
  };

  const deselectAll = () => setSelected({});

  const handleApprove = () => {
    const selectedContacts = audienceContacts.filter((c) => selected[c.id] && getContactChannels(c).length > 0);
    onApprove(selectedContacts, channels, messages);
  };

  const canProceed = () => {
    if (step === 1) return topic.trim().length > 0;
    if (step === 2) return audienceContacts.length > 0;
    if (step === 3) return channels.length > 0;
    return true;
  };

  const stepLabels = ["What to say", "Who gets it", "How to send", "Review & approve"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] p-4 gap-3 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-brand-teal" /> Send an Announcement
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tell a group of people something. FADS prepares the message — you approve before anything is sent.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1 ${i + 1 === step ? "text-brand-teal font-medium" : i + 1 < step ? "text-status-ok" : "text-muted-foreground"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i + 1 === step ? "bg-brand-teal text-white" : i + 1 < step ? "bg-status-ok/20 text-status-ok" : "bg-muted text-muted-foreground"}`}>
                  {i + 1 < step ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && <div className={`h-px flex-1 ${i + 1 < step ? "bg-status-ok/30" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: WHAT */}
        {step === 1 && (
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">What do you want to tell them?</Label>
              <Textarea
                className="min-h-[120px] text-sm"
                placeholder="What's happening? e.g. School bake sale this Friday at 2pm."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                autoFocus
              />
            </div>

            {/* Ask FADS */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={askFads}
                disabled={drafting || !topic.trim()}
              >
                {drafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand-teal" />}
                Ask FADS to write it
              </Button>
            </div>

            {/* Example chips */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Or pick an example to start</Label>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(ex)}
                    className="text-xs rounded-full border border-border hover:border-brand-teal/40 hover:bg-brand-teal/5 px-2.5 py-1 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: WHO */}
        {step === 2 && (
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Who should get it?</Label>
              <p className="text-xs text-muted-foreground">Select one or more groups. Duplicates are removed automatically.</p>
            </div>

            {/* Contact types */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">By contact type</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {crmConfig.contactTypes.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-accent">
                    <Checkbox
                      checked={audienceTypes.includes(t.value)}
                      onCheckedChange={() => setAudienceTypes(toggleArray(audienceTypes, t.value))}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Groups */}
            {groupOptions.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">By group</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {groupOptions.map((g) => (
                    <label key={g.value} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-accent">
                      <Checkbox
                        checked={audienceGroups.includes(g.value)}
                        onCheckedChange={() => setAudienceGroups(toggleArray(audienceGroups, g.value))}
                      />
                      {g.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Audience count */}
            {audienceContacts.length > 0 && (
              <div className="text-xs font-medium text-brand-teal p-2 rounded-lg bg-brand-teal/5 border border-brand-teal/20">
                {audienceContacts.length} {audienceContacts.length === 1 ? "person" : "people"} will receive your announcement
              </div>
            )}
          </div>
        )}

        {/* Step 3: HOW */}
        {step === 3 && (
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">How should we tell them?</Label>
              <p className="text-xs text-muted-foreground">Choose one or more channels. FADS will adapt the message for each.</p>
            </div>
            <div className="space-y-2">
              {[
                { value: "whatsapp", label: "WhatsApp", desc: "Short conversational message" },
                { value: "message", label: "DM / Direct Message", desc: "Concise internal message" },
                { value: "email", label: "Email", desc: "Subject + fuller announcement" },
              ].map((ch) => (
                <label
                  key={ch.value}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    channels.includes(ch.value) ? "border-brand-teal bg-brand-teal/5" : "border-border hover:bg-accent"
                  }`}
                >
                  <Checkbox
                    checked={channels.includes(ch.value)}
                    onCheckedChange={() => setChannels(toggleArray(channels, ch.value))}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">{ch.label}</div>
                    <div className="text-xs text-muted-foreground">{ch.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: REVIEW */}
        {step === 4 && (
          <div className="space-y-2.5">
            {/* Summary */}
            <div className="p-2.5 rounded-lg bg-brand-teal/5 border border-brand-teal/20 space-y-1">
              <div className="text-sm font-medium text-brand-navy">Your announcement is ready</div>
              <div className="text-xs text-muted-foreground">
                Audience: {audienceContacts.length} {audienceContacts.length === 1 ? "person" : "people"} · Channels: {channels.map((c) => c === "whatsapp" ? "WhatsApp" : c === "email" ? "Email" : "DM").join(" + ")}
              </div>
            </div>

            {/* Per-channel message previews */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Messages (you can edit these)</Label>
              {channels.includes("whatsapp") && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-brand-teal">WhatsApp</Label>
                  <Textarea
                    className="min-h-[60px] text-sm"
                    value={messages.whatsapp || ""}
                    onChange={(e) => setMessages({ ...messages, whatsapp: e.target.value })}
                  />
                </div>
              )}
              {channels.includes("email") && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-brand-teal">Email</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Subject"
                    value={messages.email_subject || ""}
                    onChange={(e) => setMessages({ ...messages, email_subject: e.target.value })}
                  />
                  <Textarea
                    className="min-h-[80px] text-sm"
                    placeholder="Email body"
                    value={messages.email_body || ""}
                    onChange={(e) => setMessages({ ...messages, email_body: e.target.value })}
                  />
                </div>
              )}
              {channels.includes("message") && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-brand-teal">DM / Direct Message</Label>
                  <Textarea
                    className="min-h-[60px] text-sm"
                    value={messages.message || ""}
                    onChange={(e) => setMessages({ ...messages, message: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Recipient list */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Recipients ({validSelected.length} selected)
                </Label>
                <div className="flex gap-1">
                  <button onClick={selectAll} className="text-xs text-brand-teal hover:underline">Select all</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={deselectAll} className="text-xs text-muted-foreground hover:underline">Clear</button>
                </div>
              </div>
              <Input
                className="h-9"
                placeholder="Search recipients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                {filtered.map((c) => {
                  const isSelected = selected[c.id];
                  const contactChannels = getContactChannels(c);
                  const isValid = contactChannels.length > 0;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-2 p-1.5 rounded-md border ${!isSelected ? "opacity-40" : ""} ${!isValid ? "opacity-50" : ""}`}
                    >
                      <button onClick={() => isValid && toggleRecipient(c.id)} className="shrink-0">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-brand-teal" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.first_name} {c.last_name || ""}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {getContactTypeLabel(orgType, c.contact_type)}
                          {!c.phone && channels.includes("whatsapp") && " · No phone"}
                          {!c.email && channels.includes("email") && " · No email"}
                          {c.status === "inactive" && " · Inactive"}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {contactChannels.map((ch) => (
                          <Badge key={ch} variant="outline" className="text-[10px]">
                            {ch === "whatsapp" ? "WA" : ch === "email" ? "Email" : "DM"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {search ? "No one matches your search." : "No recipients found."}
                  </div>
                )}
              </div>
            </div>

            {/* Skipped info */}
            {skippedSelected.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {skippedSelected.length} {skippedSelected.length === 1 ? "person was" : "people were"} excluded — missing contact details or opted out.
              </div>
            )}

            {/* Safety notice */}
            <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/50">
              FADS will not send anything until you approve it. The next step opens each channel's composer for your final review.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-1 sticky bottom-0 bg-background pb-1 -mx-4 px-4">
          {step > 1 && (
            <Button variant="outline" className="h-9 gap-1" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              className="h-9 flex-1 gap-1.5"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="h-9 flex-1 gap-1.5"
              onClick={handleApprove}
              disabled={validSelected.length === 0}
            >
              <Send className="w-4 h-4" /> Approve & Send
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}