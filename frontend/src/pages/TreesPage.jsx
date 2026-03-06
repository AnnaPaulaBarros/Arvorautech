import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  TreeDeciduous,
  Plus,
  Search,
  MapPin,
  Ruler,
  Calendar,
  Eye,
  ImageOff
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TreesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  useEffect(() => {
    fetchTrees();
  }, [user]);

  const fetchTrees = async () => {
    try {
      const endpoint = user?.role === "agronomist" ? "/trees/all" : "/trees";
      const response = await axios.get(`${API}${endpoint}`, {
        withCredentials: true
      });
      setTrees(response.data);
    } catch (error) {
      console.error("Error fetching trees:", error);
      toast.error("Erro ao carregar árvores");
    } finally {
      setLoading(false);
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

  const filteredTrees = trees.filter(
    (tree) =>
      tree.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tree.species.toLowerCase().includes(searchQuery.toLowerCase())
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
              {user?.role === "agronomist" ? "Todas as Árvores" : "Minhas Árvores"}
            </h1>
            <p className="text-muted-foreground">
              {filteredTrees.length} {filteredTrees.length === 1 ? "árvore" : "árvores"}{" "}
              {searchQuery && "encontradas"}
            </p>
          </div>
          <Button
            data-testid="new-tree-button"
            onClick={() => navigate("/trees/new")}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Árvore
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6 animate-fade-in stagger-1">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              data-testid="search-input"
              type="text"
              placeholder="Buscar por nome ou espécie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-full bg-accent/50 border-transparent focus:bg-background"
            />
          </div>
        </div>

        {/* Trees Grid */}
        {filteredTrees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTrees.map((tree, index) => (
              <TreeCard
                key={tree.tree_id}
                tree={tree}
                index={index}
                onClick={() => navigate(`/trees/${tree.tree_id}`)}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <TreeDeciduous className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "Nenhuma árvore encontrada" : "Nenhuma árvore cadastrada"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Tente buscar com outros termos"
                : "Cadastre sua primeira árvore para começar"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => navigate("/trees/new")}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Árvore
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

const TreeCard = ({ tree, index, onClick, formatDate }) => {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (tree.photo_url) {
      // Fetch image as blob
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
  }, [tree.photo_url]);

  return (
    <Card
      data-testid={`tree-card-${tree.tree_id}`}
      className="tree-card bg-card rounded-2xl overflow-hidden cursor-pointer card-shadow animate-fade-in"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-accent relative overflow-hidden">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={tree.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            {imageError ? (
              <ImageOff className="w-12 h-12 text-muted-foreground/30" />
            ) : (
              <TreeDeciduous className="w-12 h-12 text-primary/30" />
            )}
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-semibold text-lg truncate">{tree.name}</h3>
          <p className="text-white/80 text-sm truncate">{tree.species}</p>
        </div>
      </div>

      {/* Details */}
      <CardContent className="p-4 space-y-3">
        {/* Location */}
        {tree.latitude && tree.longitude && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="gps-display truncate">
              {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
            </span>
          </div>
        )}

        {/* Measurements */}
        {(tree.height || tree.diameter) && (
          <div className="flex items-center gap-3 text-sm">
            {tree.height && (
              <Badge variant="secondary" className="font-normal">
                <Ruler className="w-3 h-3 mr-1" />
                {tree.height}m
              </Badge>
            )}
            {tree.diameter && (
              <Badge variant="secondary" className="font-normal">
                Ø {tree.diameter}cm
              </Badge>
            )}
          </div>
        )}

        {/* Planting Date */}
        {tree.planting_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Plantio: {formatDate(tree.planting_date)}</span>
          </div>
        )}

        {/* View Button */}
        <Button variant="ghost" className="w-full mt-2" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
};

export default TreesPage;
