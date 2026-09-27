import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import ContentPackCard from "@/components/content/ContentPackCard";
import ContentAudienceDialog from "@/components/content/ContentAudienceDialog";
import ContentSecondaryNav from "@/components/content/ContentSecondaryNav";
import SocialMediaAudit from "@/components/content/SocialMediaAudit";
import TemplateGallery from "@/components/content/TemplateGallery";
import TemplateRecommendations from "@/components/content/TemplateRecommendations";
import WhatsAppComposer from "@/components/crm/WhatsAppComposer";
import BulkEmailDialog from "@/components/crm/BulkEmailDialog";
import BulkDirectMessageDialog from "@/components/crm/BulkDirectMessageDialog";
import { getExampleTopic } from "@/lib/contentWording";
import {
  Sparkles, Loader2, Share2, Video, Type, Hash, Mail, MessageCircle,
  MessageSquare, Image, Wand2, History, ChevronRight, Lightbulb, UserCheck,
} from "lucide-react";

const CONTENT_TYPES = [
  { key: "social_post", label: "Social Post", icon: Share2, field: "social_post" },
  { key: "reel_idea", label: "Reel / Video Idea", icon: Video, field: "reel_idea" },
  { key: "caption", label: "Caption", icon: Type, field: "caption" },
  { key: "hashtags", label: "Hashtags", icon: Hash, field: "hashtags" },
  { key: "email", label: "Email", icon: Mail, field: "email_body" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, field: "whatsapp" },
  { key: "direct_message", label: "Direct Message", icon: UserCheck, field: "direct_message" },
  { key: "short_message", label: "Short Message", icon: MessageSquare, field: "short_message" },
  { key: "flyer", label: "Flyer / Poster Copy", icon: Image, field: "flyer_headline" },
];

const QUICK_IDEAS = [
  "Give me a post idea",
  "Give me a Reel idea",
  "What should I talk about today?",
  "Turn something from my business into content",
];

export default function ContentCentre() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const orgType = activeOrg?.type || "small_business";

  const [activeTab, setActiveTab] = useState("create");
  const [topic, setTopic] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const [packId, setPackId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Audience picker + composer state
  const [audienceDialog, setAudienceDialog] = useState(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailContacts, setEmailContacts] = useState([]);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmContacts, setDmContacts] = useState([]);

  const example = useMemo(() => getExampleTopic(orgType), [orgType]);

  const loadHistory = useCallback(async () => {
    if (!orgId) return;
    setLoadingHistory(true);
    try {
      const packs = await base44.entities.ContentPack.filter(
        { organisation_id: orgId, data_mode: dataMode },
        "-created_date",
        20
      );
      setHistory(packs);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [orgId, dataMode]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleType = (key) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllTypes = () => {
    setSelectedTypes(CONTENT_TYPES.map((t) => t.key));
  };

  const handleCreate = async () => {
    if (!topic.trim()) {
      setError("Tell me what you want to talk about first.");
      return;
    }
    if (selectedTypes.length === 0) {
      setError("Choose at least one thing for me to create.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "generate_content",
        organisation_id: orgId,
        data_mode: dataMode,
        topic: topic.trim(),
        content_types: selectedTypes,
      });
      const generated = res.pack || {};
      const saved = await base44.entities.ContentPack.create({
        organisation_id: orgId,
        data_mode: dataMode,
        topic: topic.trim(),
        workspace_type: orgType,
        content_types: selectedTypes,
        ...generated,
      });
      setPack({ ...generated, topic: topic.trim() });
      setPackId(saved.id);
      loadHistory();
    } catch (e) {
      setError(e.message || "I couldn't generate your content. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (typeKey) => {
    if (!pack) return;
    setGenerating(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "generate_content",
        organisation_id: orgId,
        data_mode: dataMode,
        topic: pack.topic,
        content_types: [typeKey],
        regenerate_type: typeKey,
        existing_pack: pack,
      });
      const updated = { ...pack, ...res.pack };
      setPack(updated);
      if (packId) {
        await base44.entities.ContentPack.update(packId, updated);
      }
    } catch (e) {
      setError(e.message || "I couldn't regenerate that. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCardChange = (field, value) => {
    if (!pack) return;
    const updated = { ...pack, [field]: value };
    setPack(updated);
    if (packId) {
      base44.entities.ContentPack.update(packId, { [field]: value }).catch(() => {});
    }
  };

  const loadHistoryPack = async (id) => {
    try {
      const p = await base44.entities.ContentPack.get(id);
      setPack(p);
      setPackId(p.id);
      setTopic(p.topic);
      setSelectedTypes(p.content_types || []);
      setActiveTab("create");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const handleAudienceConfirm = (contacts) => {
    if (audienceDialog?.channel === "email") {
      setEmailContacts(contacts);
      setEmailOpen(true);
    } else if (audienceDialog?.channel === "dm") {
      setDmContacts(contacts);
      setDmOpen(true);
    } else {
      setWhatsappContacts(contacts);
      setWhatsappOpen(true);
    }
  };

  const handleWhatsAppSend = async (contact, message) => {
    await base44.entities.CRMActivity.create({
      organisation_id: orgId,
      data_mode: dataMode,
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      type: "whatsapp",
      subject: "Content Centre WhatsApp",
      content: message,
    });
    await base44.entities.CRMContact.update(contact.id, {
      last_contact_date: new Date().toISOString().slice(0, 10),
    });
  };

  // Audit → Create: pre-fill topic and content type from audit recommendation
  const handleCreateFromAudit = (step) => {
    setTopic(step.topic || "");
    setSelectedTypes(step.content_type ? [step.content_type] : ["social_post"]);
    setActiveTab("create");
    setPack(null);
    setPackId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const emailContent = pack ? `${pack.email_subject || ""}\n\n${pack.email_body || ""}` : "";
  const whatsappContent = pack?.whatsapp || "";
  const dmContent = pack?.direct_message || "";

  return (
    <div className="space-y-5">
      {/* Secondary nav */}
      <ContentSecondaryNav active={activeTab} onChange={setActiveTab} />

      {/* CREATE TAB */}
      {activeTab === "create" && (
        <div className="space-y-6">
          {/* Hero */}
          <Card className="bg-brand-navy text-white border-0 overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <FadsRobotAvatar size="lg" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">FADS CONTENT CENTRE</h1>
                  <p className="text-white/70 text-sm mt-1">What do you want to tell people about?</p>
                </div>
                <p className="text-white/60 text-sm max-w-xl">
                  Give me a topic, event, offer, announcement or rough idea. I'll turn it into the content you need.
                </p>
              </div>

              {/* Topic input */}
              <div className="max-w-2xl mx-auto mt-6 space-y-3">
                <Input
                  className="h-14 text-base bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  placeholder="What are we talking about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !generating && handleCreate()}
                />
                <p className="text-xs text-white/40 text-center">
                  e.g. "{example}"
                </p>
              </div>

              {/* Content type selection */}
              <div className="max-w-3xl mx-auto mt-4">
                <p className="text-sm text-white/70 font-medium text-center mb-3">What should FADS create?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {CONTENT_TYPES.map((t) => {
                    const active = selectedTypes.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        onClick={() => toggleType(t.key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-colors min-h-touch ${
                          active
                            ? "bg-brand-teal text-white border-brand-teal"
                            : "bg-white/5 text-white/70 border-white/20 hover:border-brand-teal"
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={selectAllTypes}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-colors min-h-touch ${
                      selectedTypes.length === CONTENT_TYPES.length
                        ? "bg-brand-teal text-white border-brand-teal"
                        : "bg-white/5 text-white/70 border-white/20 hover:border-brand-teal"
                    }`}
                  >
                    <Wand2 className="w-4 h-4" />
                    Create everything
                  </button>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col items-center gap-2 mt-6">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-brand-teal hover:bg-brand-teal/90 text-white min-h-touch px-8"
                  onClick={handleCreate}
                  disabled={generating || !topic.trim() || selectedTypes.length === 0}
                >
                  {generating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating your content…</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Create My Content</>
                  )}
                </Button>
                {error && <p className="text-sm text-red-300">{error}</p>}
              </div>

              {/* Quick start ideas */}
              <div className="max-w-2xl mx-auto mt-6">
                <p className="text-xs text-white/50 text-center mb-2">Not sure what to post? Ask FADS.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      onClick={() => setTopic(idea)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 text-white/60 border border-white/10 hover:border-brand-teal hover:text-white/90 transition-colors min-h-touch"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Pack */}
          {pack && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-brand-navy">YOUR CONTENT PACK</h2>
                <Badge variant="secondary" className="text-xs">Topic: {pack.topic}</Badge>
              </div>

              {/* Template recommendations */}
              <TemplateRecommendations
                pack={pack}
                onGoToTemplates={() => setActiveTab("templates")}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                {CONTENT_TYPES.filter((t) => pack[t.field] || (pack.content_types || selectedTypes).includes(t.key)).map((t) => {
                  const content = t.key === "email"
                    ? [pack.email_subject, pack.email_body].filter(Boolean).join("\n\n")
                    : t.key === "flyer"
                    ? [pack.flyer_headline, pack.flyer_description, pack.flyer_details, pack.flyer_cta, pack.flyer_visual].filter(Boolean).join("\n\n")
                    : pack[t.field];
                  return (
                    <ContentPackCard
                      key={t.key}
                      title={t.label}
                      icon={t.icon}
                      content={content}
                      onChange={(val) => {
                        if (t.key === "email") {
                          handleCardChange("email_body", val);
                        } else if (t.key === "flyer") {
                          handleCardChange("flyer_description", val);
                        } else {
                          handleCardChange(t.field, val);
                        }
                      }}
                      onRegenerate={() => handleRegenerate(t.key)}
                      onPrepare={
                        t.key === "whatsapp" && pack.whatsapp
                          ? () => setAudienceDialog({ channel: "whatsapp", contentPreview: pack.whatsapp })
                          : t.key === "email" && pack.email_body
                          ? () => setAudienceDialog({ channel: "email", contentPreview: emailContent })
                          : t.key === "direct_message" && pack.direct_message
                          ? () => setAudienceDialog({ channel: "dm", contentPreview: pack.direct_message })
                          : undefined
                      }
                      prepareLabel={
                        t.key === "email" ? "Prepare Email"
                        : t.key === "direct_message" ? "Prepare DM"
                        : "Prepare WhatsApp"
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AUDIT TAB */}
      {activeTab === "audit" && (
        <SocialMediaAudit onCreateFromAudit={handleCreateFromAudit} />
      )}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" && (
        <TemplateGallery
          recommendedCategories={pack ? (pack.content_types || []).flatMap((ct) => {
            const map = {
              social_post: ["Social Post", "Story", "Announcement"],
              reel_idea: ["Reel/Video", "Story"],
              flyer: ["Flyer/Poster", "Event", "Sale/Offer"],
            };
            return map[ct] || [];
          }) : []}
        />
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-teal" />
            <h2 className="text-lg font-bold text-brand-navy">Content History</h2>
          </div>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Your recent content packs will appear here so you never lose your work.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((p) => (
                <Card
                  key={p.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => loadHistoryPack(p.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.topic}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(p.created_date).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    {(p.content_types || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(p.content_types || []).slice(0, 4).map((ct) => (
                          <Badge key={ct} variant="secondary" className="text-xs capitalize">{ct.replace(/_/g, " ")}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audience picker dialog */}
      <ContentAudienceDialog
        open={!!audienceDialog}
        onClose={() => setAudienceDialog(null)}
        channel={audienceDialog?.channel}
        contentPreview={audienceDialog?.contentPreview}
        onConfirm={handleAudienceConfirm}
      />

      {/* Existing WhatsApp composer — reused from CRM */}
      <WhatsAppComposer
        open={whatsappOpen}
        onClose={() => { setWhatsappOpen(false); setWhatsappContacts([]); }}
        contacts={whatsappContacts}
        orgId={orgId}
        initialDraft={whatsappContent}
        onSend={handleWhatsAppSend}
      />

      {/* Existing Email composer — reused from CRM */}
      <BulkEmailDialog
        open={emailOpen}
        onClose={() => { setEmailOpen(false); setEmailContacts([]); }}
        contacts={emailContacts}
        orgId={orgId}
        initialSubject={pack?.email_subject || ""}
        initialBody={pack?.email_body || ""}
      />

      {/* Existing DM composer — reused from CRM */}
      <BulkDirectMessageDialog
        open={dmOpen}
        onClose={() => { setDmOpen(false); setDmContacts([]); }}
        contacts={dmContacts}
        orgId={orgId}
        initialBody={dmContent}
      />
    </div>
  );
}