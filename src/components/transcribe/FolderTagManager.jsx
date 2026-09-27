import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Folder, Tag, Plus, Trash2, Pencil, Check, X } from "lucide-react";

// Dialog for managing folders and tags. Create, rename, and delete.
export default function FolderTagManager({
  open, onClose, folders, tags, onCreateFolder, onRenameFolder, onCreateTag, onDeleteFolder, onDeleteTag,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Organise Library</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="folders">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="folders" className="text-xs">
              <Folder className="w-3.5 h-3.5 mr-1" /> Folders
            </TabsTrigger>
            <TabsTrigger value="tags" className="text-xs">
              <Tag className="w-3.5 h-3.5 mr-1" /> Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="folders" className="space-y-3 mt-3">
            <CreateForm
              placeholder="New folder name"
              onSubmit={(name) => onCreateFolder(name, "#173b5e")}
            />
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {folders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No folders yet</p>
              ) : (
                folders.map((f) => (
                  <FolderRow key={f.id} folder={f} onRename={onRenameFolder} onDelete={onDeleteFolder} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tags" className="space-y-3 mt-3">
            <CreateForm
              placeholder="New tag name"
              onSubmit={(name) => onCreateTag(name, "#1a8a8a")}
            />
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No tags yet</p>
              ) : (
                tags.map((t) => (
                  <TagRow key={t.id} tag={t} onDelete={onDeleteTag} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ placeholder, onSubmit }) {
  const [name, setName] = useState("");
  const submit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
    }
  };
  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button onClick={submit} size="sm" className="h-8 px-2">
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function FolderRow({ folder, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const save = () => {
    if (name.trim() && name !== folder.name) {
      onRename(folder.id, name.trim(), folder.description, folder.color);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: folder.color }} />
      {editing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="h-7 text-sm flex-1"
          autoFocus
        />
      ) : (
        <span className="text-sm flex-1 truncate">{folder.name}</span>
      )}
      {editing ? (
        <>
          <button onClick={save} className="text-status-ok"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setEditing(false); setName(folder.name); }} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
          <button
            onClick={() => { if (confirm(`Delete folder "${folder.name}"? Sessions will be unfiled.`)) onDelete(folder.id); }}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function TagRow({ tag, onDelete }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
      <span className="text-sm flex-1 truncate">{tag.name}</span>
      <button
        onClick={() => { if (confirm(`Delete tag "${tag.name}"?`)) onDelete(tag.id); }}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}