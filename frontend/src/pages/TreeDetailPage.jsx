import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "../components/ui/alert-dialog";
import {
  TreeDeciduous,
  MapPin,
  Ruler,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Camera,
  Plus,
  Leaf,
  Droplets,
  Scissors,
  Bug,
  Wrench,
  ImageOff
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const maintenanceTypes = [
  { value: "poda", label: "Poda", icon: Scissors },
  { value: "irrigacao", label: "Irrigação", icon: Droplets },
  { value: "adubacao", label: "Adubação", icon: Leaf },
  { value: "controle_biologico", label: "Controle Biológico", icon: Bug }
];

const maintenanceLabels = {
  poda: { label: "Poda", icon: Scissors, color: "badge-poda" },
  irrigacao: { label: "Irrigação", icon: Droplets, color: "badge-irrigacao" },
  adubacao: { label: "Adubação", icon: Leaf, color: "badge-adubacao" },
  controle_biologico: { label: "Controle Biológico", icon: Bug, color: "badge-controle" }
};

const TreeDetailPage = () => {
  const { treeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tree, setTree] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  
  // Modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({});
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTree();
    fetchMaintenance();
  }, [treeId]);

  useEffect(() => {
    if (tree?.photo_url) {
      axios
        .get(`${API}${tree.photo_url.replace("/api", "")}`, {
          withCredentials: true,
          responseType: "blob"
        })
        .then((response) => {
          const blobUrl = URL.createObjectURL(response.data);
          setImageUrl(blobUrl);
        })
        .catch(() => {
          setImageError(true);
        });
    }

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [tree?.photo_url]);

  const fetchTree = async () => {
    try {
      const response = await axios.get(`${API}/trees/${treeId}`, {
        withCredentials: true
      });
      setTree(response.data);
      setEditForm(response.data);
    } catch (error) {
      console.error("Error fetching tree:", error);
      toast.error("Erro ao carregar árvore");
      navigate("/trees");
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const response = await axios.get(`${API}/maintenance/tree/${treeId}`, {
        withCredentials: true
      });
      setMaintenance(response.data);
    } catch (error) {
      console.error("Error fetching maintenance:", error);
    }
  };

  const handleUpdateTree = async () => {
    try {
      const response = await axios.put(
        `${API}/trees/${treeId}`,
        editForm,
        { withCredentials: true }
      );
      setTree(response.data);
      setEditDialogOpen(false);
      toast.success("Árvore atualizada com sucesso");
    } catch (error) {
      console.error("Error updating tree:", error);
      toast.error("Erro ao atualizar árvore");
    }
  };

  const handleDeleteTree = async () => {
    try {
      await axios.delete(`${API}/trees/${treeId}`, {
        withCredentials: true
      });
      toast.success("Árvore excluída com sucesso");
      navigate("/trees");
    } catch (error) {
      console.error("Error deleting tree:", error);
      toast.error("Erro ao excluir árvore");
    }
  };

  const handleAddMaintenance = async () => {
    if (!maintenanceForm.maintenance_type || !maintenanceForm.date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await axios.post(
        `${API}/maintenance`,
        {
          tree_id: treeId,
          ...maintenanceForm
        },
        { withCredentials: true }
      );
      setMaintenanceDialogOpen(false);
      setMaintenanceForm({
        maintenance_type: "",
        date: new Date().toISOString().split("T")[0],
        notes: ""
      });
      fetchMaintenance();
      toast.success("Manutenção registrada com sucesso");
    } catch (error) {
      console.error("Error adding maintenance:", error);
      toast.error("Erro ao registrar manutenção");
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      toast.error("Selecione uma foto");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await axios.post(
        `${API}/trees/${treeId}/photo`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchTree();
      toast.success("Foto enviada com sucesso");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaintenance = async (maintenanceId) => {
    try {
      await axios.delete(`${API}/maintenance/${maintenanceId}`, {
        withCredentials: true
      });
      fetchMaintenance();
      toast.success("Manutenção excluída");
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      toast.error("Erro ao excluir manutenção");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!tree) {
    return (
      <Layout>
        <div className="p-4 md:p-8 text-center">
          <p>Árvore não encontrada</p>
          <Button onClick={() => navigate("/trees")} className="mt-4">
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Back Button */}
        <Button
          data-testid="back-button"
          variant="ghost"
          onClick={() => navigate("/trees")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Card */}
            <Card className="rounded-2xl overflow-hidden card-shadow animate-fade-in">
              <div className="aspect-video bg-accent relative">
                {imageUrl && !imageError ? (
                  <img
                    src={imageUrl}
                    alt={tree.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5">
                    {imageError ? (
                      <ImageOff className="w-16 h-16 text-muted-foreground/30" />
                    ) : (
                      <TreeDeciduous className="w-16 h-16 text-primary/30" />
                    )}
                    <p className="text-muted-foreground mt-2">Sem foto</p>
                  </div>
                )}
                
                {/* Upload Photo Button */}
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      data-testid="upload-photo-button"
                      className="absolute bottom-4 right-4 btn-primary"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {tree.photo_url ? "Alterar Foto" : "Adicionar Foto"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby="upload-photo-description">
                    <DialogHeader>
                      <DialogTitle>Upload de Foto</DialogTitle>
                      <p id="upload-photo-description" className="text-sm text-muted-foreground">
                        Selecione uma foto para a árvore
                      </p>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="upload-preview aspect-video flex items-center justify-center cursor-pointer"
                        onClick={() => document.getElementById("photo-input").click()}
                      >
                        {selectedFile ? (
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <div className="text-center">
                            <Camera className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-muted-foreground">Clique para selecionar</p>
                          </div>
                        )}
                      </div>
                      <input
                        id="photo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                      <Button
                        onClick={handleUploadPhoto}
                        disabled={!selectedFile || uploading}
                        className="w-full btn-primary"
                      >
                        {uploading ? "Enviando..." : "Enviar Foto"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold font-['Outfit']">{tree.name}</h1>
                    <p className="text-muted-foreground">{tree.species}</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="edit-tree-button" variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" aria-describedby="edit-tree-description">
                        <DialogHeader>
                          <DialogTitle>Editar Árvore</DialogTitle>
                          <p id="edit-tree-description" className="text-sm text-muted-foreground">
                            Atualize as informações da árvore
                          </p>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Nome</Label>
                            <Input
                              value={editForm.name || ""}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Espécie</Label>
                            <Input
                              value={editForm.species || ""}
                              onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Altura (m)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={editForm.height || ""}
                                onChange={(e) => setEditForm({ ...editForm, height: parseFloat(e.target.value) || null })}
                              />
                            </div>
                            <div>
                              <Label>Diâmetro (cm)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={editForm.diameter || ""}
                                onChange={(e) => setEditForm({ ...editForm, diameter: parseFloat(e.target.value) || null })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Observações</Label>
                            <Textarea
                              value={editForm.notes || ""}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleUpdateTree} className="w-full btn-primary">
                            Salvar Alterações
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button data-testid="delete-tree-button" variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Árvore</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir "{tree.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteTree}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {tree.height && (
                    <div className="p-3 rounded-xl bg-accent/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Ruler className="w-4 h-4" />
                        Altura
                      </div>
                      <p className="font-semibold">{tree.height}m</p>
                    </div>
                  )}
                  {tree.diameter && (
                    <div className="p-3 rounded-xl bg-accent/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Ruler className="w-4 h-4" />
                        Diâmetro
                      </div>
                      <p className="font-semibold">{tree.diameter}cm</p>
                    </div>
                  )}
                  {tree.planting_date && (
                    <div className="p-3 rounded-xl bg-accent/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        Plantio
                      </div>
                      <p className="font-semibold">{formatDate(tree.planting_date)}</p>
                    </div>
                  )}
                  {tree.latitude && tree.longitude && (
                    <div className="p-3 rounded-xl bg-accent/50 col-span-2 md:col-span-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <MapPin className="w-4 h-4" />
                        GPS
                      </div>
                      <p className="font-semibold gps-display text-xs">
                        {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {tree.notes && (
                  <div className="mt-4 p-4 rounded-xl bg-accent/30">
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p>{tree.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Timeline */}
          <div className="space-y-6">
            <Card className="rounded-2xl card-shadow animate-fade-in stagger-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    Manutenções
                  </span>
                  <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-maintenance-button" size="sm" className="btn-primary">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby="maintenance-description">
                      <DialogHeader>
                        <DialogTitle>Nova Manutenção</DialogTitle>
                        <p id="maintenance-description" className="text-sm text-muted-foreground">
                          Registre uma nova manutenção para esta árvore
                        </p>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tipo de Manutenção</Label>
                          <Select
                            value={maintenanceForm.maintenance_type}
                            onValueChange={(value) =>
                              setMaintenanceForm({ ...maintenanceForm, maintenance_type: value })
                            }
                          >
                            <SelectTrigger data-testid="maintenance-type-select">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {maintenanceTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="w-4 h-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Input
                            type="date"
                            value={maintenanceForm.date}
                            onChange={(e) =>
                              setMaintenanceForm({ ...maintenanceForm, date: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Observações</Label>
                          <Textarea
                            value={maintenanceForm.notes}
                            onChange={(e) =>
                              setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })
                            }
                            placeholder="Detalhes da manutenção..."
                          />
                        </div>
                        <Button
                          data-testid="save-maintenance-button"
                          onClick={handleAddMaintenance}
                          className="w-full btn-primary"
                        >
                          Registrar Manutenção
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {maintenance.length > 0 ? (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {maintenance.map((maint) => {
                      const typeInfo = maintenanceLabels[maint.maintenance_type] || {
                        label: maint.maintenance_type,
                        icon: Wrench,
                        color: "bg-gray-100"
                      };
                      return (
                        <div
                          key={maint.maintenance_id}
                          className="timeline-item group"
                          data-testid={`maintenance-item-${maint.maintenance_id}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={typeInfo.color + " text-xs"}>
                              {typeInfo.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              onClick={() => handleDeleteMaintenance(maint.maintenance_id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium">{formatDate(maint.date)}</p>
                          {maint.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {maint.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      Nenhuma manutenção registrada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TreeDetailPage;
