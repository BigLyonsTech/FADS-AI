import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail, Send, Inbox, Trash2, MailOpen, Plus, Users, MessageCircle, Smartphone } from "lucide-react";
import MessageDialog from "@/components/messages/MessageDialog";

// Lightweight internal team messaging. Messages are scoped to the active
// organisation (RLS: only sender + recipient can read their messages) and the
// list is filtered client-side by the active org so switching workspaces shows
// only that org's messages.
export default function Messages() {
  const { activeOrg, loading } = useWorkspace();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [demoSent, setDemoSent] = useState(false);
  const [externalPhone, setExternalPhone] = useState("");
  const [externalMessage, setExternalMessage] = useState("");

  const load = async () => {
    if (!activeOrg) return;
    setLoadingData(true);
    try {
      const [msgs, mems] = await Promise.all([
        base44.entities.Message.filter({ organisation_id: activeOrg.id }),
        base44.entities.OrganisationMembership.filter({
          organisation_id: activeOrg.id,
          status: "active",
        }),
      ]);
      msgs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setMessages(msgs);
      setMembers(mems.filter((m) => m.user_id && m.user_id !== user?.id));
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeOrg?.id]);

  const inbox = messages.filter((m) => m.recipient_id === user?.id);
  const sent = messages.filter((m) => m.sender_id === user?.id);
  const unreadCount = inbox.filter((m) => !m.read).length;
  const isDemo = activeOrg?.data_mode === "demo" || activeOrg?.is_demo === true || activeOrg?.name?.toLowerCase().includes("demo");

  const markRead = async (m, value) => {
    await base44.entities.Message.update(m.id, { read: value });
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read: value } : x)));
  };

  const removeMessage = async (m) => {
    if (!confirm("Delete this message?")) return;
    await base44.entities.Message.delete(m.id);
    setMessages((list) => list.filter((x) => x.id !== m.id));
    if (expandedId === m.id) setExpandedId(null);
  };

  const toggleExpand = async (m) => {
    setExpandedId((id) => (id === m.id ? null : m.id));
    if (m.recipient_id === user?.id && !m.read) {
      await markRead(m, true);
    }
  };

  if (loading || !activeOrg) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" />
      </div>
    );
  }

  const fmtDate = (d) => new Date(d).toLocaleString();
  const normalisedPhone = externalPhone.replace(/[^\d+]/g, "");
  const whatsappPhone = normalisedPhone.replace(/\D/g, "");
  const externalReady = Boolean(whatsappPhone && externalMessage.trim());
  const smsHref = externalReady ? `sms:${normalisedPhone}?body=${encodeURIComponent(externalMessage.trim())}` : undefined;
  const whatsappHref = externalReady ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(externalMessage.trim())}` : undefined;

  const renderList = (list, isSent) => {
    if (loadingData) {
      return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
    }
    if (!list.length) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No messages.
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-2">
        {list.map((m) => {
          const expanded = expandedId === m.id;
          const otherName = isSent ? m.recipient_name : m.sender_name;
          const unread = !isSent && !m.read;
          return (
            <Card key={m.id} className={unread ? "border-brand-teal/40 bg-brand-mint/20" : ""}>
              <CardContent className="p-3 sm:p-4 space-y-2">
                <button className="w-full text-left" onClick={() => toggleExpand(m)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {unread && <span className="w-2 h-2 rounded-full bg-brand-teal shrink-0" />}
                      <span
                        className={`font-medium truncate ${unread ? "text-brand-navy" : "text-foreground"}`}
                      >
                        {otherName}
                      </span>
                      {isSent ? (
                        <Badge variant="outline" className="text-xs">Sent</Badge>
                      ) : unread ? (
                        <Badge className="text-xs bg-brand-teal text-white">New</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Read</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDate(m.created_date)}</span>
                  </div>
                  {m.subject && <div className="text-sm font-medium mt-1 truncate">{m.subject}</div>}
                  <div className="text-sm text-muted-foreground truncate">{m.body}</div>
                </button>
                {expanded && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <div className="flex gap-2 flex-wrap">
                      {!isSent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9"
                          onClick={() => markRead(m, !m.read)}
                        >
                          {m.read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                          Mark {m.read ? "unread" : "read"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-destructive"
                        onClick={() => removeMessage(m)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6 text-brand-teal" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Messages</h1>
            <p className="text-muted-foreground text-sm truncate">
              Internal team messages or external SMS and WhatsApp.
            </p>
          </div>
        </div>
        <Button
          className="h-11 gap-1"
          onClick={() => setShowCompose(true)}
          disabled={!members.length && !isDemo}
        >
          <Plus className="w-4 h-4" /> New Message
        </Button>
      </div>

      {!members.length && !isDemo && (
        <Card>
          <CardContent className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              There isn't another signed-in team member available for internal messaging yet. Add a team member, then make sure they accept access and sign in before sending a message.
            </p>
            <Button asChild variant="outline" className="h-11 gap-2">
              <a href="/team">
                <Users className="w-4 h-4" /> Go to Team
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {isDemo && (
        <Card className="border-brand-teal/30 bg-brand-mint/20">
          <CardContent className="py-4 text-sm">
            <p className="font-semibold text-brand-navy">Team messaging is included in FADS AI.</p>
            <p className="text-muted-foreground mt-1">
              In a live workspace, team members can send private internal messages to other active members of their organisation.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="internal">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="internal" className="gap-1.5">
            <Users className="w-4 h-4" /> Internal
          </TabsTrigger>
          <TabsTrigger value="external" className="gap-1.5">
            <Smartphone className="w-4 h-4" /> External
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="space-y-4 mt-4">
          <Tabs defaultValue="inbox">
            <TabsList>
              <TabsTrigger value="inbox" className="gap-1">
                <Inbox className="w-4 h-4" /> Inbox
                {unreadCount > 0 && <Badge className="ml-1 bg-brand-teal text-white text-xs">{unreadCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-1">
                <Send className="w-4 h-4" /> Sent
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inbox" className="space-y-2">{renderList(inbox, false)}</TabsContent>
            <TabsContent value="sent" className="space-y-2">{renderList(sent, true)}</TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-brand-navy flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-brand-teal" /> External Message
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Send a message using your phone's SMS app or WhatsApp. FADS prepares the message, then you review and send it in the chosen app.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mobile number</label>
                <input
                  type="tel"
                  value={externalPhone}
                  onChange={(e) => setExternalPhone(e.target.value)}
                  placeholder="e.g. +353 87 123 4567"
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">Include the country code for WhatsApp.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={externalMessage}
                  onChange={(e) => setExternalMessage(e.target.value)}
                  placeholder="Type your message…"
                  className="w-full min-h-28 rounded-md border border-input bg-background p-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button asChild variant="outline" className="h-11" disabled={!externalReady}>
                  <a href={smsHref || "#"} aria-disabled={!externalReady} onClick={(e) => !externalReady && e.preventDefault()}>
                    <Smartphone className="w-4 h-4" /> Open SMS
                  </a>
                </Button>
                <Button asChild className="h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white" disabled={!externalReady}>
                  <a href={whatsappHref || "#"} target="_blank" rel="noreferrer" aria-disabled={!externalReady} onClick={(e) => !externalReady && e.preventDefault()}>
                    <MessageCircle className="w-4 h-4" /> Open WhatsApp
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                External messages are sent through your device or WhatsApp, not from FADS AI itself.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {demoSent && (
        <Card className="border-brand-teal/30 bg-brand-mint/20">
          <CardContent className="py-3 text-sm font-medium text-brand-navy">
            Demo message sent ✓ In a live workspace, the recipient would receive it in their FADS AI inbox.
          </CardContent>
        </Card>
      )}

      <MessageDialog
        open={showCompose}
        onClose={() => setShowCompose(false)}
        orgId={activeOrg.id}
        members={members}
        demoMode={isDemo}
        onSent={(result) => {
          if (result?.demo) {
            setDemoSent(true);
          } else {
            load();
          }
        }}
      />
    </div>
  );
}