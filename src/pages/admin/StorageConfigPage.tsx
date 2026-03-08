import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Cloud, HardDrive, ImageIcon, Loader2, Save, Plus, Trash2, Settings } from "lucide-react";

interface StorageProvider {
  id: string;
  provider_name: string;
  is_enabled: boolean;
  priority: number;
  credentials: Record<string, string>;
}

interface ProviderMeta {
  label: string;
  icon: typeof Cloud;
  fields: { key: string; label: string; sensitive?: boolean }[];
}

const providerMeta: Record<string, ProviderMeta> = {
  cloudinary: {
    label: "Cloudinary",
    icon: Cloud,
    fields: [
      { key: "cloud_name", label: "Cloud Name" },
      { key: "upload_preset", label: "Upload Preset" },
    ],
  },
  s3: {
    label: "AWS S3",
    icon: HardDrive,
    fields: [
      { key: "access_key", label: "Access Key", sensitive: true },
      { key: "secret_key", label: "Secret Key", sensitive: true },
      { key: "bucket_name", label: "Bucket Name" },
      { key: "region", label: "Region" },
    ],
  },
  imagekit: {
    label: "ImageKit",
    icon: ImageIcon,
    fields: [
      { key: "public_key", label: "Public Key" },
      { key: "url_endpoint", label: "URL Endpoint" },
    ],
  },
};

const presetProviders = [
  { value: "cloudinary", label: "Cloudinary" },
  { value: "s3", label: "AWS S3" },
  { value: "imagekit", label: "ImageKit" },
  { value: "backblaze", label: "Backblaze B2" },
  { value: "digitalocean", label: "DigitalOcean Spaces" },
  { value: "wasabi", label: "Wasabi" },
  { value: "custom", label: "Custom Provider" },
];

const StorageConfigPage = () => {
  const [providers, setProviders] = useState<StorageProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", provider_name: "", priority: 1 });
  const [newFields, setNewFields] = useState<{ key: string; label: string; sensitive: boolean; value: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  // For custom credential fields on unknown providers
  const [addFieldDialog, setAddFieldDialog] = useState<string | null>(null);
  const [newFieldKey, setNewFieldKey] = useState("");
  const { toast } = useToast();

  const fetchProviders = async () => {
    const { data, error } = await supabase
      .from("storage_providers")
      .select("*")
      .order("priority", { ascending: true });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProviders((data as StorageProvider[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProviders(); }, []);

  const updateProvider = (id: string, updates: Partial<StorageProvider>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const updateCredential = (id: string, key: string, value: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, credentials: { ...p.credentials, [key]: value } }
          : p
      )
    );
  };

  const removeCredential = (id: string, key: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const creds = { ...p.credentials };
        delete creds[key];
        return { ...p, credentials: creds };
      })
    );
  };

  const handleSave = async (provider: StorageProvider) => {
    setSaving(provider.id);
    const { error } = await supabase
      .from("storage_providers")
      .update({
        is_enabled: provider.is_enabled,
        priority: provider.priority,
        credentials: provider.credentials as any,
      })
      .eq("id", provider.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const label = providerMeta[provider.provider_name]?.label ?? provider.provider_name;
      toast({ title: `${label} saved` });
    }
    setSaving(null);
  };

  const handleDelete = async (provider: StorageProvider) => {
    if (!confirm(`Delete ${providerMeta[provider.provider_name]?.label ?? provider.provider_name}?`)) return;
    setDeleting(provider.id);
    const { error } = await supabase.from("storage_providers").delete().eq("id", provider.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProviders((prev) => prev.filter((p) => p.id !== provider.id));
      toast({ title: "Provider deleted" });
    }
    setDeleting(null);
  };

  const openAddDialog = () => {
    setNewProvider({ name: "", provider_name: "", priority: providers.length + 1 });
    setNewFields([]);
    setAddOpen(true);
  };

  const selectPreset = (value: string) => {
    const meta = providerMeta[value];
    if (meta) {
      setNewProvider((p) => ({ ...p, provider_name: value, name: meta.label }));
      setNewFields(meta.fields.map((f) => ({ ...f, sensitive: f.sensitive ?? false, value: "" })));
    } else {
      const preset = presetProviders.find((pp) => pp.value === value);
      setNewProvider((p) => ({ ...p, provider_name: value === "custom" ? "" : value, name: preset?.label ?? "" }));
      // Default fields for known non-meta providers
      if (value === "backblaze") {
        setNewFields([
          { key: "application_key_id", label: "Application Key ID", sensitive: true, value: "" },
          { key: "application_key", label: "Application Key", sensitive: true, value: "" },
          { key: "bucket_name", label: "Bucket Name", sensitive: false, value: "" },
          { key: "region", label: "Region", sensitive: false, value: "" },
        ]);
      } else if (value === "digitalocean") {
        setNewFields([
          { key: "access_key", label: "Access Key", sensitive: true, value: "" },
          { key: "secret_key", label: "Secret Key", sensitive: true, value: "" },
          { key: "bucket_name", label: "Bucket Name", sensitive: false, value: "" },
          { key: "region", label: "Region", sensitive: false, value: "" },
          { key: "endpoint", label: "Endpoint URL", sensitive: false, value: "" },
        ]);
      } else if (value === "wasabi") {
        setNewFields([
          { key: "access_key", label: "Access Key", sensitive: true, value: "" },
          { key: "secret_key", label: "Secret Key", sensitive: true, value: "" },
          { key: "bucket_name", label: "Bucket Name", sensitive: false, value: "" },
          { key: "region", label: "Region", sensitive: false, value: "" },
        ]);
      } else {
        setNewFields([]);
      }
    }
  };

  const addNewField = () => {
    setNewFields((prev) => [...prev, { key: "", label: "", sensitive: false, value: "" }]);
  };

  const handleAddProvider = async () => {
    if (!newProvider.provider_name.trim()) {
      toast({ title: "Provider name is required", variant: "destructive" });
      return;
    }
    setAdding(true);
    const credentials: Record<string, string> = {};
    newFields.forEach((f) => {
      if (f.key.trim()) credentials[f.key.trim()] = f.value;
    });

    const { error } = await supabase.from("storage_providers").insert({
      provider_name: newProvider.provider_name.trim().toLowerCase().replace(/\s+/g, "_"),
      is_enabled: false,
      priority: newProvider.priority,
      credentials: credentials as any,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${newProvider.name || newProvider.provider_name} added` });
      setAddOpen(false);
      fetchProviders();
    }
    setAdding(false);
  };

  const getProviderMeta = (provider: StorageProvider): ProviderMeta => {
    if (providerMeta[provider.provider_name]) return providerMeta[provider.provider_name];
    // Generate meta from credentials keys for unknown providers
    const fields = Object.keys(provider.credentials).map((key) => ({
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      sensitive: key.includes("secret") || key.includes("key") || key.includes("password"),
    }));
    return {
      label: provider.provider_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: Settings,
      fields,
    };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Storage Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure external image storage providers. Images will be uploaded to the highest-priority enabled provider with automatic fallback.
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </div>

      <div className="space-y-6">
        {providers.map((provider) => {
          const meta = getProviderMeta(provider);
          const Icon = meta.icon;
          const isKnown = !!providerMeta[provider.provider_name];

          return (
            <Card key={provider.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{meta.label}</CardTitle>
                      <CardDescription>
                        Priority: {provider.priority}
                        {provider.is_enabled && (
                          <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                            Enabled
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Priority</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        className="w-16 h-8 text-center"
                        value={provider.priority}
                        onChange={(e) =>
                          updateProvider(provider.id, { priority: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <Switch
                      checked={provider.is_enabled}
                      onCheckedChange={(v) => updateProvider(provider.id, { is_enabled: v })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {meta.fields.map((field) => (
                    <div key={field.key} className="relative">
                      <Label className="text-xs">{field.label}</Label>
                      <div className="flex gap-1">
                        <Input
                          type={field.sensitive ? "password" : "text"}
                          value={provider.credentials[field.key] ?? ""}
                          onChange={(e) =>
                            updateCredential(provider.id, field.key, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="flex-1"
                        />
                        {!isKnown && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => removeCredential(provider.id, field.key)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!isKnown && (
                  <>
                    {addFieldDialog === provider.id ? (
                      <div className="flex items-end gap-2 mt-4">
                        <div className="flex-1">
                          <Label className="text-xs">Field Key</Label>
                          <Input
                            value={newFieldKey}
                            onChange={(e) => setNewFieldKey(e.target.value)}
                            placeholder="e.g. api_token"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newFieldKey.trim()) {
                              updateCredential(provider.id, newFieldKey.trim(), "");
                              setNewFieldKey("");
                              setAddFieldDialog(null);
                            }
                          }}
                        >
                          Add
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddFieldDialog(null); setNewFieldKey(""); }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => { setAddFieldDialog(provider.id); setNewFieldKey(""); }}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Credential Field
                      </Button>
                    )}
                  </>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    onClick={() => handleSave(provider)}
                    disabled={saving === provider.id}
                  >
                    {saving === provider.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(provider)}
                    disabled={deleting === provider.id}
                  >
                    {deleting === provider.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {providers.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No storage providers configured. Click "Add Provider" to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Provider Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Storage Provider</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Provider Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {presetProviders.map((pp) => (
                  <Button
                    key={pp.value}
                    type="button"
                    variant={newProvider.provider_name === pp.value ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => selectPreset(pp.value)}
                  >
                    {pp.label}
                  </Button>
                ))}
              </div>
            </div>

            {newProvider.provider_name === "" && (
              <div>
                <Label>Custom Provider Name</Label>
                <Input
                  value={newProvider.name}
                  onChange={(e) => setNewProvider((p) => ({ ...p, name: e.target.value, provider_name: e.target.value }))}
                  placeholder="e.g. my_storage"
                />
              </div>
            )}

            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={newProvider.priority}
                onChange={(e) => setNewProvider((p) => ({ ...p, priority: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {newFields.length > 0 && (
              <div className="space-y-3">
                <Label>Credentials</Label>
                {newFields.map((field, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <Label className="text-xs">Key</Label>
                      <Input
                        value={field.key}
                        onChange={(e) => {
                          const updated = [...newFields];
                          updated[idx] = { ...updated[idx], key: e.target.value };
                          setNewFields(updated);
                        }}
                        placeholder="key"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Value</Label>
                      <Input
                        type={field.sensitive ? "password" : "text"}
                        value={field.value}
                        onChange={(e) => {
                          const updated = [...newFields];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          setNewFields(updated);
                        }}
                        placeholder="value"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setNewFields((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" size="sm" onClick={addNewField}>
              <Plus className="mr-1 h-3 w-3" /> Add Credential Field
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProvider} disabled={adding}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default StorageConfigPage;
