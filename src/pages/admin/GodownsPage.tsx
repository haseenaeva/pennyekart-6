import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Warehouse, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Godown {
  id: string;
  name: string;
  godown_type: string;
  is_active: boolean;
  created_at: string;
}

interface LocalBody {
  id: string;
  name: string;
  body_type: string;
  ward_count: number;
}

interface GodownLocalBody {
  id: string;
  godown_id: string;
  local_body_id: string;
  locations_local_bodies?: LocalBody;
}

const GODOWN_TYPES = [
  { value: "micro", label: "Micro Godown", desc: "Under one panchayath, multi wards. Customer visible." },
  { value: "local", label: "Local Godown", desc: "Multi panchayath backup. Not customer visible." },
  { value: "area", label: "Area Godown", desc: "Multi panchayath + selling partners. Customer visible." },
];

const GodownsPage = () => {
  const { toast } = useToast();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [godownLocalBodies, setGodownLocalBodies] = useState<GodownLocalBody[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGodown, setSelectedGodown] = useState<Godown | null>(null);
  const [form, setForm] = useState({ name: "", godown_type: "micro" });
  const [assignLocalBodyId, setAssignLocalBodyId] = useState("");
  const [activeTab, setActiveTab] = useState("micro");

  const fetchGodowns = async () => {
    const { data } = await supabase.from("godowns").select("*").order("created_at", { ascending: false });
    if (data) setGodowns(data as Godown[]);
  };

  const fetchLocalBodies = async () => {
    const { data } = await supabase.from("locations_local_bodies").select("id, name, body_type, ward_count").eq("is_active", true);
    if (data) setLocalBodies(data as LocalBody[]);
  };

  const fetchGodownLocalBodies = async () => {
    const { data } = await supabase.from("godown_local_bodies").select("id, godown_id, local_body_id, locations_local_bodies(id, name, body_type, ward_count)");
    if (data) setGodownLocalBodies(data as unknown as GodownLocalBody[]);
  };

  useEffect(() => { fetchGodowns(); fetchLocalBodies(); fetchGodownLocalBodies(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("godowns").insert({ name: form.name.trim(), godown_type: form.godown_type });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Godown created" }); setDialogOpen(false); setForm({ name: "", godown_type: "micro" }); fetchGodowns(); }
  };

  const handleAssign = async () => {
    if (!selectedGodown || !assignLocalBodyId) return;
    const { error } = await supabase.from("godown_local_bodies").insert({ godown_id: selectedGodown.id, local_body_id: assignLocalBodyId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Panchayath assigned" }); setAssignLocalBodyId(""); fetchGodownLocalBodies(); }
  };

  const handleRemoveAssignment = async (id: string) => {
    await supabase.from("godown_local_bodies").delete().eq("id", id);
    fetchGodownLocalBodies();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("godowns").delete().eq("id", id);
    fetchGodowns(); fetchGodownLocalBodies();
  };

  const filteredGodowns = godowns.filter(g => g.godown_type === activeTab);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Godowns</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Godown</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Godown</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={200} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.godown_type} onValueChange={v => setForm({ ...form, godown_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GODOWN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">{GODOWN_TYPES.find(t => t.value === form.godown_type)?.desc}</p>
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {GODOWN_TYPES.map(t => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} ({godowns.filter(g => g.godown_type === t.value).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {GODOWN_TYPES.map(t => (
            <TabsContent key={t.value} value={t.value}>
              <div className="space-y-4">
                {filteredGodowns.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No {t.label}s yet.</CardContent></Card>
                ) : filteredGodowns.map(g => {
                  const assignments = godownLocalBodies.filter(glb => glb.godown_id === g.id);
                  return (
                    <Card key={g.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Warehouse className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{g.name}</CardTitle>
                          <Badge variant={g.is_active ? "default" : "secondary"}>{g.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedGodown(g); setAssignDialogOpen(true); }}>
                            Assign Panchayath
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(g.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-2 text-sm text-muted-foreground">Assigned Panchayaths:</p>
                        {assignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">None assigned</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {assignments.map(a => (
                              <Badge key={a.id} variant="outline" className="gap-1">
                                {a.locations_local_bodies?.name ?? "Unknown"}
                                <button onClick={() => handleRemoveAssignment(a.id)} className="ml-1 text-destructive hover:text-destructive/80">×</button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Panchayath to {selectedGodown?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={assignLocalBodyId} onValueChange={setAssignLocalBodyId}>
                <SelectTrigger><SelectValue placeholder="Select panchayath" /></SelectTrigger>
                <SelectContent>
                  {localBodies.map(lb => <SelectItem key={lb.id} value={lb.id}>{lb.name} ({lb.body_type})</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!assignLocalBodyId} className="w-full">Assign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default GodownsPage;
