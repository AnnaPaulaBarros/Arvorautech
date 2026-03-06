import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
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
  User,
  Mail,
  Shield,
  LogOut,
  TreeDeciduous,
  Leaf
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);

  const handleRoleChange = async (newRole) => {
    setUpdating(true);
    try {
      const response = await axios.put(
        `${API}/auth/role`,
        { role: newRole },
        { withCredentials: true }
      );
      updateUser(response.data);
      toast.success(`Perfil atualizado para ${newRole === "agronomist" ? "Agrônomo" : "Cliente"}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold font-['Outfit'] mb-8">
            Meu Perfil
          </h1>
        </div>

        {/* Profile Card */}
        <Card className="rounded-2xl card-shadow animate-fade-in stagger-1">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold font-['Outfit'] mb-1">{user?.name}</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-4">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <Badge
                  variant={user?.role === "agronomist" ? "default" : "secondary"}
                  className="text-sm"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.role === "agronomist" ? "Agrônomo" : "Cliente"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Selection */}
        <Card className="rounded-2xl card-shadow mt-6 animate-fade-in stagger-2">
          <CardHeader>
            <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Tipo de Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Escolha o tipo de conta que melhor se aplica a você:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Option */}
              <div
                data-testid="role-client"
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  user?.role === "client"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleRoleChange("client")}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-secondary/30 flex items-center justify-center">
                    <TreeDeciduous className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Cliente</h3>
                    <p className="text-xs text-muted-foreground">Para jardineiros domésticos</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cadastre e gerencie suas próprias árvores e manutenções.
                </p>
              </div>

              {/* Agronomist Option */}
              <div
                data-testid="role-agronomist"
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  user?.role === "agronomist"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleRoleChange("agronomist")}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Agrônomo</h3>
                    <p className="text-xs text-muted-foreground">Para profissionais</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesse todas as árvores e clientes do sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="rounded-2xl card-shadow mt-6 animate-fade-in stagger-3">
          <CardContent className="p-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-testid="logout-button"
                  variant="destructive"
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja sair da sua conta?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfilePage;
