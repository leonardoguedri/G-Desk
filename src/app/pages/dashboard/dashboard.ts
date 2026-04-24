import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Chamado {
  id: number;
  protocolo: string;
  titulo: string;
  instituicao: string;
  unidade: string;
  setor_destino: string;
  setor_abertura: string;
  categoria: string;
  responsavel_nome: string;
  status: string;
  data_criacao: string;
  data_conclusao: string;
  canal: string;
  solicitante_nome: string;
  criador_nome: string;
  sla_resposta: string;
  sla_solucao: string;
  usuario_id: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  visualizacao: 'lista' | 'bloco' = 'lista';
  filtroAba: 'geral' | 'pendente' | 'execucao' | 'concluido' = 'geral';
  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');

  chamados: Chamado[] = [];
  carregando = true;

  paginaAtual = 1;
  itensPorPagina = 10;

  filtrosAbertos = false;

  // MÚLTIPLOS FILTROS
  filtrosAtivos: { campo: string, label: string, valor?: string, dataInicio?: string, dataFim?: string }[] = [];
  campoFiltroSelecionado = '';
  valorFiltroTemp = '';
  dataInicioTemp = '';
  dataFimTemp = '';

  opcoesFiltro = [
    { campo: 'protocolo', label: 'Número de Protocolo', tipo: 'texto' },
    { campo: 'setor_destino', label: 'Setor Responsável', tipo: 'texto' },
    { campo: 'canal', label: 'Canal', tipo: 'texto' },
    { campo: 'categoria', label: 'Categoria', tipo: 'texto' },
    { campo: 'solicitante_nome', label: 'Solicitante', tipo: 'texto' },
    { campo: 'data', label: 'Data de Criação', tipo: 'data' },
    { campo: 'criador_nome', label: 'Criado por', tipo: 'texto' },
    { campo: 'data_conclusao', label: 'Data de Conclusão', tipo: 'data' },
    { campo: 'setor_abertura', label: 'Setor de Abertura', tipo: 'texto' },
    { campo: 'status', label: 'Status do Chamado', tipo: 'texto' },
    { campo: 'sla_solucao', label: 'SLA (Conclusão)', tipo: 'texto' },
    { campo: 'sla_resposta', label: 'SLA (Resposta)', tipo: 'texto' },
    { campo: 'titulo', label: 'Título', tipo: 'texto' },
    { campo: 'instituicao', label: 'Instituição', tipo: 'texto' },
    { campo: 'unidade', label: 'Unidade', tipo: 'texto' },
    { campo: 'responsavel_nome', label: 'Usuário Responsável', tipo: 'texto' },
  ];

  get opcaoSelecionada() {
    return this.opcoesFiltro.find(o => o.campo === this.campoFiltroSelecionado);
  }

  get isFiltroData() {
    return this.opcaoSelecionada?.tipo === 'data';
  }

  get opcoesDisponiveis() {
    const camposAtivos = this.filtrosAtivos.map(f => f.campo);
    return this.opcoesFiltro.filter(o => !camposAtivos.includes(o.campo));
  }

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.carregarChamados();
  }

  adicionarFiltro() {
    if (!this.campoFiltroSelecionado) return;
    const opcao = this.opcaoSelecionada;
    if (!opcao) return;

    if (opcao.tipo === 'data') {
      if (!this.dataInicioTemp && !this.dataFimTemp) return;
      this.filtrosAtivos.push({
        campo: this.campoFiltroSelecionado,
        label: opcao.label,
        dataInicio: this.dataInicioTemp,
        dataFim: this.dataFimTemp
      });
    } else {
      if (!this.valorFiltroTemp.trim()) return;
      this.filtrosAtivos.push({
        campo: this.campoFiltroSelecionado,
        label: opcao.label,
        valor: this.valorFiltroTemp
      });
    }

    this.campoFiltroSelecionado = '';
    this.valorFiltroTemp = '';
    this.dataInicioTemp = '';
    this.dataFimTemp = '';
    this.pesquisar();
  }

  removerFiltro(index: number) {
    this.filtrosAtivos.splice(index, 1);
    this.pesquisar();
  }

  async pesquisar() {
    this.paginaAtual = 1;
    await this.carregarChamados();
  }

  async limparFiltros() {
    this.filtrosAtivos = [];
    this.campoFiltroSelecionado = '';
    this.valorFiltroTemp = '';
    this.dataInicioTemp = '';
    this.dataFimTemp = '';
    this.paginaAtual = 1;
    await this.carregarChamados();
  }

  async carregarChamados() {
    this.carregando = true;
    try {
      const params: string[] = [];

      for (const f of this.filtrosAtivos) {
        if (f.valor) {
          params.push(`campo=${f.campo}&valor=${encodeURIComponent(f.valor)}`);
        }
        if (f.campo === 'data') {
          if (f.dataInicio) params.push(`data_inicio=${f.dataInicio}`);
          if (f.dataFim) params.push(`data_fim=${f.dataFim}`);
        }
        if (f.campo === 'data_conclusao') {
          if (f.dataInicio) params.push(`conclusao_inicio=${f.dataInicio}`);
          if (f.dataFim) params.push(`conclusao_fim=${f.dataFim}`);
        }
      }

      const url = '/chamados?' + params.join('&');
      const data = await this.api.get(url);
      this.chamados = [...data];
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  get chamadosFiltrados() {
    return this.chamados.filter(c => {
      if (this.filtroAba === 'pendente') return c.status === 'Pendente';
      if (this.filtroAba === 'execucao') return c.status === 'Em Execução';
      if (this.filtroAba === 'concluido') return c.status === 'Concluído';
      return true;
    });
  }

  get totalPaginas() {
    return Math.ceil(this.chamadosFiltrados.length / this.itensPorPagina);
  }

  get chamadosPaginados() {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.chamadosFiltrados.slice(inicio, inicio + this.itensPorPagina);
  }

  get paginas() {
    const total = this.totalPaginas;
    const atual = this.paginaAtual;
    const paginas: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) paginas.push(i);
    } else {
      paginas.push(1);
      if (atual > 3) paginas.push(-1);
      for (let i = Math.max(2, atual - 1); i <= Math.min(total - 1, atual + 1); i++) paginas.push(i);
      if (atual < total - 2) paginas.push(-1);
      paginas.push(total);
    }
    return paginas;
  }

  irParaPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaAtual = pagina;
    this.cdr.detectChanges();
  }

  setFiltroAba(f: any) {
    this.filtroAba = f;
    this.paginaAtual = 1;
    this.cdr.detectChanges();
  }

  abrirDetalhe(id: number) {
    this.router.navigate(['/chamado', id]);
  }

  mudarVisualizacao(tipo: 'lista' | 'bloco') {
    this.visualizacao = tipo;
    this.paginaAtual = 1;
  }

  getStatusClass(status: string) {
    if (status === 'Pendente') return 'pendente';
    if (status === 'Em Execução') return 'execucao';
    if (status === 'Concluído') return 'concluido';
    return '';
  }

  exportarCSV() {
    const headers = ['Protocolo', 'Status', 'Instituição', 'Setor', 'Categoria', 'Responsável', 'Data'];
    const rows = this.chamadosFiltrados.map(c => [
      c.protocolo, c.status, c.instituicao,
      c.setor_destino, c.categoria, c.responsavel_nome || '-', c.data_criacao
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chamados.csv';
    link.click();
  }
}