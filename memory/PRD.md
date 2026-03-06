# ArvouraTech - Product Requirements Document

## Problem Statement
Aplicativo fullstack chamado ArvouraTech para agrônomos e usuários cuidarem de árvores e jardins.

## User Personas
1. **Agrônomo Profissional**: Gerencia múltiplos clientes e suas árvores, precisa de dashboard completo
2. **Cliente/Jardineiro Doméstico**: Cuida das próprias árvores, registra manutenções

## Core Requirements (Static)
- Cadastro de usuários (agrônomo e cliente)
- Cadastro de árvore com foto, medidas, GPS, data de plantio
- Galeria de árvores do usuário
- Registro de manutenção (poda, irrigação, adubação, controle biológico)
- Dashboard do agrônomo mostrando todas as árvores e clientes
- Upload de fotos para armazenamento externo

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Emergent Google Auth
- **Storage**: Emergent Object Storage

## What's Been Implemented (06/03/2026)
- [x] Landing page com hero section e features
- [x] Google OAuth login via Emergent Auth
- [x] Dashboard com Bento Grid layout
- [x] Página de árvores com galeria
- [x] Cadastro de árvore com GPS via Geolocation API
- [x] Upload de fotos para Emergent Storage
- [x] Detalhes da árvore com edição e exclusão
- [x] Registro de manutenção (poda, irrigação, adubação, controle biológico)
- [x] Histórico de manutenções com filtro por tipo
- [x] Perfil do usuário com troca de role (cliente/agrônomo)
- [x] Layout responsivo com navegação mobile

## Prioritized Backlog
### P0 (Critical) - Done
- All core features implemented

### P1 (High Priority)
- Notificações push para lembretes de manutenção
- Relatórios PDF exportáveis
- Busca avançada com filtros

### P2 (Medium Priority)
- Integração com previsão do tempo
- Gráficos de crescimento da árvore
- Compartilhamento de árvores

## Next Tasks
1. Implementar notificações de lembretes
2. Adicionar relatórios em PDF
3. Filtros avançados na busca
