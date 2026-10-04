/**
 * Ícones das ações por contexto.
 *
 * O domínio das ações é dado puro (id, rótulo, grupo). O ícone é escolha de
 * tela, então mora aqui: um mapa de id → ícone, para que a mesma ação tenha o
 * mesmo desenho em qualquer lugar que a mostre — barra da ficha, "⋯" do topo,
 * folha do celular.
 */
import { Archive, ArrowUpRight, Bookmark, Camera, Copy, Dices, Download, Edit3, Eye, FileJson, FileText, History, Heart, Image, Lightbulb, MessageCircle, Mic, Package, Pin, Plus, Printer, Search, Share2, Sparkles, Trash2, Users, Wrench, Bell, FolderOpen, Settings2, Target, MonitorPlay, SlidersHorizontal, Moon, ScanEye, EyeOff, Undo2, Redo2, Check, HeartPulse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONES: Record<string, LucideIcon> = {
  // ficha
  editar: Edit3,
  conversar: MessageCircle,
  'vi-hoje': Eye,
  favoritar: Heart,
  'puxar-assunto': Lightbulb,
  compartilhar: Share2,
  'adicionar-foto': Camera,
  reavaliar: Sparkles,
  'nova-nota': FileText,
  'nova-meta': Target,
  'ver-relacoes': Users,
  voz: Mic,
  pasta: FolderOpen,
  tags: Bookmark,
  fixar: Pin,
  arquivar: Archive,
  duplicar: Copy,
  'exportar-png': Download,
  'exportar-json': FileJson,
  imprimir: Printer,
  lembrete: Bell,
  lixeira: Trash2,
  // tela inicial
  buscar: Search,
  surpresa: Dices,
  momentos: MonitorPlay,
  adicionar: Plus,
  explorar: ArrowUpRight,
  selecionar: Check,
  exportar: Download,
  saude: HeartPulse,
  ajustes: Settings2,
  // topo
  rapidas: Sparkles,
  foco: Eye,
  disfarce: ScanEye,
  privacidade: EyeOff,
  tema: Moon,
  desfazer: Undo2,
  refazer: Redo2,
  salvamento: Check,
  densidade: SlidersHorizontal,
  ferramentas: Wrench,
  historico: History,
  pacote: Package,
  imagem: Image,
};

/** Sem ícone cadastrado a linha aparece só com o texto — nunca quebra. */
export function iconeDaAcao(id: string): LucideIcon | undefined {
  return ICONES[id];
}
