import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  TreeDeciduous,
  Users,
  Wrench,
  Plus,
  ArrowRight,
  Leaf,
  Droplets,
  Scissors,
  Bug,
  Calendar
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

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const isAgronomist = user?.role === "agronomist";

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Welcome Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold font-['Outfit'] mb-2">
            Olá, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            {isAgronomist
              ? "Visão geral de todos os clientes e árvores"
              : "Acompanhe suas árvores e manutenções"}
          </p>
        </div>

        {/* Bento Grid Dashboard */}
        <div className="bento-grid">
          {/* Total Trees - Large */}
          <Card
            data-testid="stat-trees"
            className="bento-item-large bg-primary text-primary-foreground rounded-2xl overflow-hidden animate-fade-in"
          >
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div>
                <TreeDeciduous className="w-10 h-10 mb-4 opacity-80" />
                <div className="text-5xl md:text-6xl font-bold font-['Outfit'] mb-2">
                  {stats?.total_trees || 0}
                </div>
                <p className="text-primary-foreground/80 text-lg">
                  Árvores Cadastradas
                </p>
              </div>
              <Button
                data-testid="add-tree-button"
                onClick={() => navigate("/trees/new")}
                className="bg-white/20 hover:bg-white/30 text-white mt-4 rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Árvore
              </Button>
            </CardContent>
          </Card>

          {/* Maintenance Stats - Tall */}
          <Card
            data-testid="stat-maintenance"
            className="bento-item-tall bg-card rounded-2xl card-shadow animate-fade-in stagger-1"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Manutenções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold font-['Outfit']">
                {stats?.total_maintenance || 0}
              </div>
              <div className="space-y-3">
                {Object.entries(stats?.maintenance_by_type || {}).map(([type, count]) => {
                  const typeInfo = maintenanceLabels[type] || {
                    label: type,
                    icon: Wrench,
                    color: "bg-gray-100"
                  };
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <typeInfo.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{typeInfo.label}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
                {Object.keys(stats?.maintenance_by_type || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma manutenção registrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users (Agronomist only) */}
          {isAgronomist && (
            <Card
              data-testid="stat-users"
              className="bg-card rounded-2xl card-shadow animate-fade-in stagger-2"
            >
              <CardContent className="p-6">
                <Users className="w-8 h-8 text-primary mb-3" />
                <div className="text-3xl font-bold font-['Outfit'] mb-1">
                  {stats?.total_users || 0}
                </div>
                <p className="text-muted-foreground text-sm">Clientes</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card
            className={`bg-card rounded-2xl card-shadow animate-fade-in stagger-3 ${
              !isAgronomist ? "bento-item-wide" : ""
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                data-testid="quick-action-trees"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate("/trees")}
              >
                <TreeDeciduous className="w-4 h-4 mr-2" />
                Ver todas árvores
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
              <Button
                data-testid="quick-action-maintenance"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate("/maintenance")}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Histórico de manutenções
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Trees - Wide */}
          <Card
            data-testid="recent-trees"
            className="bento-item-wide bg-card rounded-2xl card-shadow animate-fade-in stagger-4"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TreeDeciduous className="w-5 h-5 text-primary" />
                  Árvores Recentes
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/trees")}
                  className="text-primary"
                >
                  Ver todas
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recent_trees?.slice(0, 4).map((tree) => (
                  <div
                    key={tree.tree_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/trees/${tree.tree_id}`)}
                    data-testid={`tree-item-${tree.tree_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TreeDeciduous className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tree.name}</p>
                        <p className="text-sm text-muted-foreground">{tree.species}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tree.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!stats?.recent_trees || stats.recent_trees.length === 0) && (
                  <div className="text-center py-8">
                    <TreeDeciduous className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma árvore cadastrada</p>
                    <Button
                      onClick={() => navigate("/trees/new")}
                      className="mt-4 btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar primeira árvore
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Maintenance */}
          <Card
            data-testid="recent-maintenance"
            className="bento-item-tall bg-card rounded-2xl card-shadow animate-fade-in stagger-5"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats?.recent_maintenance?.slice(0, 5).map((maint) => {
                  const typeInfo = maintenanceLabels[maint.maintenance_type] || {
                    label: maint.maintenance_type,
                    icon: Wrench,
                    color: "bg-gray-100"
                  };
                  return (
                    <div key={maint.maintenance_id} className="timeline-item">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={typeInfo.color + " text-xs"}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(maint.date)}
                      </p>
                    </div>
                  );
                })}
                {(!stats?.recent_maintenance || stats.recent_maintenance.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
