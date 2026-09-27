import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CalendarRange } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import CrmNav from "@/components/crm/CrmNav";
import CrmPageIntro from "@/components/crm/CrmPageIntro";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import OfferDialog from "@/components/crm/OfferDialog";

export default function CRMOffers() {
  const crm = useCrm();
  const { loading, offers } = crm;
  const [showDialog, setShowDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const openNew = () => {
    setEditingOffer(null);
    setShowDialog(true);
  };

  const openEdit = (offer) => {
    setEditingOffer(offer);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingOffer(null);
  };

  const sorted = [...offers].sort((a, b) => (a.start_date || "9999") > (b.start_date || "9999") ? 1 : -1);

  return (
    <div className="space-y-4">
      <CrmNav orgType={crm.orgType} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Offers</h1>
        <Button size="sm" className="h-9 gap-1" onClick={openNew}>
          <Plus className="w-4 h-4" /> New Offer
        </Button>
      </div>

      <CrmPageIntro
        whatIs="Keep simple business offers and promotions together with the rest of your CRM."
        whatYouCanDo="Create an offer, set its dates, and mark it Active or Inactive."
      />

      {sorted.length === 0 ? (
        <Card><CardContent className="py-2">
          <CrmEmptyState
            message="No offers yet. Add one when you have a promotion or time-limited offer to keep track of."
            actionLabel="Add an offer"
            actionIcon={Plus}
            onAction={openNew}
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((offer) => (
            <Card key={offer.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{offer.title}</span>
                    <Badge variant={offer.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                      {offer.status}
                    </Badge>
                  </div>
                  {offer.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{offer.description}</p>}
                  {(offer.start_date || offer.end_date) && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <CalendarRange className="w-3.5 h-3.5" />
                      <span>{offer.start_date || "No start date"} — {offer.end_date || "No end date"}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-9 gap-1 shrink-0" onClick={() => openEdit(offer)}>
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OfferDialog
        open={showDialog}
        onClose={closeDialog}
        record={editingOffer}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateOffer(id, payload);
          else await crm.createOffer(payload);
          closeDialog();
        }}
      />
    </div>
  );
}