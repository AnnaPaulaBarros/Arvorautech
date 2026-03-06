import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import {
  Wrench,
  Search,
  TreeDeciduous,
  Leaf,
  Droplets,
  Scissors,
  Bug,
  Calendar,
  Trash2,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const maintenanceLabels = {
  poda: { label: "Poda", icon: Scissors, color: "badge-poda" },
  irrigacao: { label: "Irrigação", icon: Droplets, color: "badge-irrigacao" },
  adubacao: { label: "Adubação", icon: Leaf, color: "badge-adubacao" },
  controle_biologico: { label: "Controle Biológico", icon: Bug, color: "badge-controle" }
};

const MaintenancePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState([]);
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [maintenanceRes, treesRes] = await Promise.all([
        axios.get(`${API}/maintenance`, { withCredentials: true }),
        axios.get(`${API}/trees`, { withCredentials: true })
      ]);
      setMaintenance(maintenanceRes.data);
      setTrees(treesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (maintenanceId) => {
    try {
      await axios.delete(`${API}/maintenance/${maintenanceId}`, {
        withCredentials: true
      });
      setMaintenance(maintenance.filter((m) => m.maintenance_id !== maintenanceId));
      toast.success("Manutenção excluída");
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      toast.error("Erro ao excluir manutenção");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getTreeName = (treeId) => {
    const tree = trees.find((t) => t.tree_id === treeId);
    return tree?.name || "Árvore desconhecida";
  };

  const filteredMaintenance =
    filterType === "all"
      ? maintenance
      : maintenance.filter((m) => m.maintenance_type === filterType);

  // Group by date
  const groupedMaintenance = filteredMaintenance.reduce((groups, maint) => {
    const date = maint.date?.split("T")[0] || "unknown";
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(maint);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMaintenance).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold font-['Outfit']">
              Histórico de Manutenções
            </h1>
            <p className="text-muted-foreground">
              {filteredMaintenance.length}{" "}
              {filteredMaintenance.length === 1 ? "registro" : "registros"}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 animate-fade-in stagger-1">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-select" className="w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="poda">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Poda
                  </div>
                </SelectItem>
                <SelectItem value="irrigacao">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    Irrigação
                  </div>
                </SelectItem>
                <SelectItem value="adubacao">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Adubação
                  </div>
                </SelectItem>
                <SelectItem value="controle_biologico">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Controle Biológico
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Maintenance List */}
        {sortedDates.length > 0 ? (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <div key={date} className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold font-['Outfit']">
                    {formatDate(date)}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedMaintenance[date].map((maint) => {
                    const typeInfo = maintenanceLabels[maint.maintenance_type] || {
                      label: maint.maintenance_type,
                      icon: Wrench,
                      color: "bg-gray-100"
                    };
                    return (
                      <Card
                        key={maint.maintenance_id}
                        data-testid={`maintenance-card-${maint.maintenance_id}`}
                        className="rounded-2xl card-shadow group"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Badge className={typeInfo.color}>
                              <typeInfo.icon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                              onClick={() => handleDelete(maint.maintenance_id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/trees/${maint.tree_id}`)}
                          >
                            <TreeDeciduous className="w-4 h-4" />
                            <span className="font-medium">{getTreeName(maint.tree_id)}</span>
                          </div>
                          {maint.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {maint.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <Wrench className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filterType !== "all"
                ? "Nenhuma manutenção deste tipo"
                : "Nenhuma manutenção registrada"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {filterType !== "all"
                ? "Tente outro filtro ou cadastre novas manutenções"
                : "Registre manutenções nas suas árvores"}
            </p>
            <Button onClick={() => navigate("/trees")} className="btn-primary">
              <TreeDeciduous className="w-4 h-4 mr-2" />
              Ver Árvores
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MaintenancePage;
