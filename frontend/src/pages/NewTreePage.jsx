import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  TreeDeciduous,
  ArrowLeft,
  Camera,
  MapPin,
  Loader2,
  Check
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewTreePage = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    name: "",
    species: "",
    height: "",
    diameter: "",
    latitude: null,
    longitude: null,
    planting_date: "",
    notes: ""
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsObtained, setGpsObtained] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGpsObtained(true);
        setGpsLoading(false);
        toast.success("Localização obtida com sucesso");
      },
      (error) => {
        setGpsLoading(false);
        let message = "Erro ao obter localização";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Permissão de localização negada";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Localização indisponível";
            break;
          case error.TIMEOUT:
            message = "Tempo esgotado ao obter localização";
            break;
        }
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.species) {
      toast.error("Preencha nome e espécie da árvore");
      return;
    }

    setLoading(true);

    try {
      // Create tree
      const treeData = {
        name: form.name,
        species: form.species,
        height: form.height ? parseFloat(form.height) : null,
        diameter: form.diameter ? parseFloat(form.diameter) : null,
        latitude: form.latitude,
        longitude: form.longitude,
        planting_date: form.planting_date || null,
        notes: form.notes || null
      };

      const treeResponse = await axios.post(`${API}/trees`, treeData, {
        withCredentials: true
      });

      const treeId = treeResponse.data.tree_id;

      // Upload photo if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        await axios.post(`${API}/trees/${treeId}/photo`, formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      toast.success("Árvore cadastrada com sucesso!");
      navigate(`/trees/${treeId}`);
    } catch (error) {
      console.error("Error creating tree:", error);
      toast.error("Erro ao cadastrar árvore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
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

        <Card className="rounded-2xl card-shadow animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-['Outfit']">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <TreeDeciduous className="w-6 h-6 text-primary" />
              </div>
              Cadastrar Nova Árvore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div>
                <Label className="mb-2 block">Foto da Árvore</Label>
                <div
                  className={`upload-preview aspect-video flex items-center justify-center cursor-pointer ${
                    previewUrl ? "has-image" : ""
                  }`}
                  onClick={() => document.getElementById("tree-photo").click()}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <Camera className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Clique para adicionar uma foto
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        PNG, JPG ou WEBP até 10MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="tree-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Árvore *</Label>
                  <Input
                    id="name"
                    data-testid="tree-name-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Ipê Amarelo do Jardim"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="species">Espécie *</Label>
                  <Input
                    id="species"
                    data-testid="tree-species-input"
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    placeholder="Ex: Handroanthus albus"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              {/* Measurements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Altura (metros)</Label>
                  <Input
                    id="height"
                    data-testid="tree-height-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    placeholder="Ex: 5.5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="diameter">Diâmetro do Tronco (cm)</Label>
                  <Input
                    id="diameter"
                    data-testid="tree-diameter-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.diameter}
                    onChange={(e) => setForm({ ...form, diameter: e.target.value })}
                    placeholder="Ex: 30"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* GPS Location */}
              <div>
                <Label className="mb-2 block">Localização GPS</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    data-testid="get-location-button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={gpsLoading}
                    className="flex-shrink-0"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : gpsObtained ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2" />
                    )}
                    {gpsLoading
                      ? "Obtendo..."
                      : gpsObtained
                      ? "Localização Obtida"
                      : "Obter Localização"}
                  </Button>
                  {form.latitude && form.longitude && (
                    <div className="gps-display text-sm text-muted-foreground">
                      {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clique no botão para capturar automaticamente sua localização atual
                </p>
              </div>

              {/* Planting Date */}
              <div>
                <Label htmlFor="planting_date">Data de Plantio</Label>
                <Input
                  id="planting_date"
                  data-testid="tree-planting-date-input"
                  type="date"
                  value={form.planting_date}
                  onChange={(e) => setForm({ ...form, planting_date: e.target.value })}
                  className="mt-1 max-w-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  data-testid="tree-notes-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informações adicionais sobre a árvore..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/trees")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-tree-button"
                  disabled={loading}
                  className="flex-1 btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Cadastrar Árvore"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NewTreePage;
