import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import PipelineCard from "@/components/crm/PipelineCard";
import BulkActionsBar from "@/components/crm/BulkActionsBar";
import { formatCurrencyCompact } from "@/lib/currencyFormat";
import { getPipelineConfig, getStageDisplayName } from "@/lib/crmWording";

// Visual movable pipeline — card-based board with drag-and-drop on
// desktop and "Move to" on mobile. Moving a card updates the EXISTING
// CRMLead record's stage (no duplicate contacts created).
//
// Workspace-adaptive: stage display names, FADS guidance text and
// intelligence indicators adapt to the organisation type (Business,
// School, Church, University) via getPipelineConfig / getStageDisplayName.
//
// Reuses existing: CRMLead.stage, CRMPipelineStage records, CRMContact
// phone/email for communication actions, FollowUpDialog, WhatsAppComposer.
export default function PipelineBoard({
  leads, stages, contacts, tasks = [], currency, orgType,
  onMove, onEdit, onDelete, onFollowUp, onWhatsApp, onEmail, onDirectMessage,
  onBookAppointment, onSetReminder, onAddNew, addLabel,
  onBulkWhatsApp, onBulkDirectMessage, onBulkEmail, onBulkMoveStage, onBulkFollowUp,
}) {
  const [isMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const [selected, setSelected] = useState({});
  const fmtCurrency = (v) => formatCurrencyCompact(v, currency);
  const pipeConfig = getPipelineConfig(orgType);

  const contactMap = useMemo(() => {
    const m = {};
    contacts.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contacts]);

  // Build display-name → internal-name map (first database stage that maps
  // to each display name). This handles both old and new stage names.
  const displayToInternal = useMemo(() => {
    const m = {};
    stages.forEach((s) => {
      const display = getStageDisplayName(s.name, orgType);
      if (!m[display]) m[display] = s.name;
    });
    return m;
  }, [stages, orgType]);

  // Build the ordered list of display stages (merging duplicates).
  const displayStages = useMemo(() => {
    const result = [];
    const seen = new Set();
    // Use the canonical pipeline stages for ordering, but only show
    // stages that actually exist in the database (or all canonical if DB empty)
    const canonical = pipeConfig.stages;
    canonical.forEach((cs) => {
      if (displayToInternal[cs.name]) {
        result.push({ ...cs, internalName: displayToInternal[cs.name] });
        seen.add(cs.name);
      }
    });
    // Add any DB stages not in canonical (shouldn't normally happen)
    stages.forEach((s) => {
      const display = getStageDisplayName(s.name, orgType);
      if (!seen.has(display)) {
        result.push({ name: display, color: s.color, internalName: s.name });
        seen.add(display);
      }
    });
    return result;
  }, [stages, orgType, displayToInternal, pipeConfig]);

  // Group leads by display name
  const leadsByDisplay = useMemo(() => {
    const m = {};
    displayStages.forEach((ds) => { m[ds.name] = []; });
    leads.forEach((l) => {
      const display = getStageDisplayName(l.stage, orgType);
      if (m[display]) m[display].push(l);
      else if (m["NEW"] || m["NEW ENQUIRY"] || m["NEW VISITOR"]) {
        // fallback: put in first column
        const first = displayStages[0];
        if (first) m[first.name].push(l);
      }
    });
    return m;
  }, [leads, displayStages, orgType]);

  const selectedLeads = useMemo(
    () => leads.filter((l) => selected[l.id]),
    [leads, selected]
  );
  const selectedContacts = useMemo(
    () => selectedLeads.map((l) => contactMap[l.contact_id]).filter(Boolean),
    [selectedLeads, contactMap]
  );

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const displayTarget = result.destination.droppableId;
    const internalTarget = displayToInternal[displayTarget];
    if (!internalTarget) return;
    const lead = leads.find((l) => l.id === result.draggableId);
    if (lead && getStageDisplayName(lead.stage, orgType) !== displayTarget) {
      onMove(lead, internalTarget);
    }
  };

  const toggleSelect = (leadId) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[leadId]) delete next[leadId];
      else next[leadId] = true;
      return next;
    });
  };

  const selectAll = () => {
    const next = {};
    leads.forEach((l) => { next[l.id] = true; });
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const handleBulkMoveStage = (stageInternalName) => {
    selectedLeads.forEach((l) => {
      if (getStageDisplayName(l.stage, orgType) !== getStageDisplayName(stageInternalName, orgType)) {
        onMove(l, stageInternalName);
      }
    });
    clearSelection();
  };

  if (isMobile) {
    // Mobile: stacked stages with "Move to" on each card
    return (
      <div className="space-y-4">
        {selectedLeads.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedLeads.length}
            totalCount={leads.length}
            onSelectAll={selectAll}
            onClear={clearSelection}
            onWhatsApp={onBulkWhatsApp ? () => onBulkWhatsApp(selectedContacts) : undefined}
            onDirectMessage={onBulkDirectMessage ? () => onBulkDirectMessage(selectedContacts) : undefined}
            onEmail={onBulkEmail ? () => onBulkEmail(selectedContacts) : undefined}
            onFollowUp={onBulkFollowUp ? () => onBulkFollowUp(selectedContacts) : undefined}
            onMoveStage={onBulkMoveStage ? () => onBulkMoveStage(selectedLeads) : undefined}
          />
        )}
        {displayStages.map((stage) => {
          const stageLeads = leadsByDisplay[stage.name] || [];
          if (stageLeads.length === 0) return null;
          const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
          return (
            <div key={stage.name}>
              <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: stage.color + "30" }}>
                <div className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
                <span className="font-semibold text-sm" style={{ color: stage.color }}>{stage.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: stage.color + "22", color: stage.color }}>{stageLeads.length}</span>
                {stageValue > 0 && <span className="text-xs text-muted-foreground ml-auto">{fmtCurrency(stageValue)}</span>}
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    contact={contactMap[lead.contact_id]}
                    tasks={tasks}
                    stages={stages}
                    displayStages={displayStages}
                    currency={currency}
                    orgType={orgType}
                    onMove={onMove}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onFollowUp={onFollowUp}
                    onWhatsApp={onWhatsApp}
                    onEmail={onEmail}
                    onDirectMessage={onDirectMessage}
                    onBookAppointment={onBookAppointment}
                    onSetReminder={onSetReminder}
                    isMobile
                    selected={!!selected[lead.id]}
                    onToggleSelect={() => toggleSelect(lead.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {leads.length === 0 && (
          <Card><CardContent className="py-2 text-center text-sm text-muted-foreground py-8">
            {pipeConfig.emptyMessage} Tap "{addLabel}" to add your first one.
          </CardContent></Card>
        )}
      </div>
    );
  }

  // Desktop: drag-and-drop kanban
  return (
    <div className="space-y-3">
      {selectedLeads.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedLeads.length}
          totalCount={leads.length}
          onSelectAll={selectAll}
          onClear={clearSelection}
          onWhatsApp={onBulkWhatsApp ? () => onBulkWhatsApp(selectedContacts) : undefined}
          onDirectMessage={onBulkDirectMessage ? () => onBulkDirectMessage(selectedContacts) : undefined}
          onEmail={onBulkEmail ? () => onBulkEmail(selectedContacts) : undefined}
          onFollowUp={onBulkFollowUp ? () => onBulkFollowUp(selectedContacts) : undefined}
          onMoveStage={onBulkMoveStage ? () => onBulkMoveStage(selectedLeads) : undefined}
        />
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayStages.map((stage) => {
            const stageLeads = leadsByDisplay[stage.name] || [];
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
            return (
              <div key={stage.name} className="flex-shrink-0 w-72">
                <Droppable droppableId={stage.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-lg border p-3 h-full min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? "border-brand-teal/40" : "border-border"
                      }`}
                      style={{
                        backgroundColor: snapshot.isDraggingOver ? undefined : stage.color + "0D",
                        borderTopColor: stage.color,
                        borderTopWidth: "3px",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
                          <span className="font-semibold text-sm" style={{ color: stage.color }}>{stage.name}</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: stage.color + "22", color: stage.color }}>{stageLeads.length}</span>
                      </div>
                      {stageValue > 0 && <div className="text-xs text-muted-foreground mb-2">{fmtCurrency(stageValue)}</div>}
                      <div className="space-y-2">
                        {stageLeads.map((lead, idx) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                            {(p, s) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                className={`rounded-lg ${s.isDragging ? "shadow-lg ring-2 ring-brand-teal/40" : ""}`}
                              >
                                <PipelineCard
                                   lead={lead}
                                   contact={contactMap[lead.contact_id]}
                                   tasks={tasks}
                                   stages={stages}
                                   displayStages={displayStages}
                                   currency={currency}
                                   orgType={orgType}
                                   onMove={onMove}
                                   onEdit={onEdit}
                                   onDelete={onDelete}
                                   onFollowUp={onFollowUp}
                                   onWhatsApp={onWhatsApp}
                                   onEmail={onEmail}
                                   onDirectMessage={onDirectMessage}
                                   onBookAppointment={onBookAppointment}
                                   onSetReminder={onSetReminder}
                                   selected={!!selected[lead.id]}
                                   onToggleSelect={() => toggleSelect(lead.id)}
                                 />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageLeads.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed border-border/50 rounded-lg">
                            Drop here
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

// FADS pipeline guidance banner — shown at the top of the pipeline page.
// Workspace-adaptive: helper text and "Ask FADS" action adapt to org type.
export function PipelineFadsGuidance({ orgType, onAskFads }) {
  const config = getPipelineConfig(orgType);
  return (
    <div className="flex items-start gap-3 bg-brand-navy rounded-xl p-4 text-white">
      <FadsRobotAvatar size="md" className="shrink-0" />
      <div className="min-w-0 space-y-1 flex-1">
        <p className="text-sm font-semibold tracking-wide">{config.pipelineTitle}</p>
        <p className="text-sm font-medium">{config.pipelineHelper}</p>
        <p className="text-xs text-white/70 leading-relaxed">{config.pipelineDescription}</p>
        <p className="text-[11px] text-white/40 pt-0.5">
          Tip: Drag cards between columns on desktop, or use "Move to" on mobile.
        </p>
      </div>
      {onAskFads && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-white/30 text-white hover:bg-white/10 hover:text-white shrink-0 min-h-touch"
          onClick={onAskFads}
        >
          {config.askFadsLabel}
        </Button>
      )}
    </div>
  );
}