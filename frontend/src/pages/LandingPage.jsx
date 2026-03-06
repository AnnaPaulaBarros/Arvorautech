import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Leaf, Droplets, Scissors, Bug, ChevronRight, TreeDeciduous, Users, BarChart3 } from "lucide-react";

const LandingPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const features = [
    {
      icon: TreeDeciduous,
      title: "Cadastro de Árvores",
      description: "Registre suas árvores com fotos, medidas e localização GPS automática."
    },
    {
      icon: Scissors,
      title: "Controle de Podas",
      description: "Acompanhe o histórico completo de podas e manutenções."
    },
    {
      icon: Droplets,
      title: "Irrigação Inteligente",
      description: "Registre e planeje irrigações para cada árvore do seu jardim."
    },
    {
      icon: Bug,
      title: "Controle Biológico",
      description: "Monitore pragas e tratamentos aplicados em cada espécie."
    }
  ];

  const stats = [
    { value: "500+", label: "Árvores Monitoradas" },
    { value: "50+", label: "Agrônomos Ativos" },
    { value: "1000+", label: "Manutenções Registradas" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-['Outfit']">ArvouraTech</span>
          </div>
          <Button
            data-testid="login-button"
            onClick={login}
            className="btn-primary"
          >
            Entrar com Google
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1652522104577-d442132b61b7?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85')`
          }}
        />
        <div className="absolute inset-0 hero-overlay" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 text-center">
          <div className="animate-fade-in">
            <span className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm mb-6">
              Tecnologia para cuidar da natureza
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 font-['Outfit']">
              Gerencie suas árvores com precisão científica
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              A plataforma completa para agrônomos e entusiastas de jardinagem acompanharem o crescimento e saúde de suas árvores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                data-testid="hero-cta-button"
                onClick={login}
                size="lg"
                className="btn-primary text-base px-8 py-6"
              >
                Começar Agora
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl md:text-5xl font-bold text-primary-foreground mb-2 font-['Outfit']">
                  {stat.value}
                </div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-['Outfit']">
              Tudo que você precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ferramentas completas para o cuidado profissional de árvores e jardins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-card border-border/50 rounded-2xl card-shadow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 font-['Outfit']">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Agronomist Section */}
      <section className="py-20 md:py-32 bg-accent/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
                Para Profissionais
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 font-['Outfit']">
                Dashboard completo para agrônomos
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Visualize todas as árvores e clientes em um só lugar. Acompanhe métricas, histórico de manutenções e muito mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Gestão de Clientes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Relatórios Detalhados</span>
                </div>
              </div>
            </div>
            <div className="relative animate-fade-in stagger-2">
              <img
                src="https://images.unsplash.com/photo-1758524052101-db20bc203b41?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
                alt="Agronomist working with tablet"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-['Outfit']">
            Pronto para transformar seu jardim?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Junte-se a centenas de agrônomos e jardineiros que já utilizam o ArvouraTech
          </p>
          <Button
            data-testid="cta-button"
            onClick={login}
            size="lg"
            className="btn-primary text-base px-8 py-6"
          >
            Criar conta gratuita
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold font-['Outfit']">ArvouraTech</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 ArvouraTech. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
