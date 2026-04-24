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
  responsavel: string;
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
  instituicoes: any[] = [];
  carregando = true;

  paginaAtual = 1;
  itensPorPagina = 10;

  filtrosAbertos = false;

  campoFiltro = '';
  valorFiltro = '';
  dataInicio = '';
  dataFim = '';

  opcoesFiltro = [
    { campo: 'protocolo', label: 'Número de Protocolo' },
    { campo: 'setor_destino', label: 'Setor Responsável' },
    { campo: 'canal', label: 'Canal' },
    { campo: 'categoria', label: 'Categoria' },
    { campo: 'solicitante_nome', label: 'Solicitante' },
    { campo: 'data', label: 'Data (intervalo)' },
    { campo: 'criador_nome', label: 'Criado por' },
    { campo: 'data_conclusao', label: 'Data de Conclusão' },
    { campo: 'setor_abertura', label: 'Setor de Abertura' },
    { campo: 'status', label: 'Status do Chamado' },
    { campo: 'sla_solucao', label: 'Tempo de SLA (Conclusão)' },
    { campo: 'sla_resposta', label: 'Tempo de SLA (Resposta)' },
    { campo: 'titulo', label: 'Título' },
    { campo: 'instituicao', label: 'Instituição' },
    { campo: 'unidade', label: 'Unidade' },
    { campo: 'responsavel_nome', label: 'Usuário Responsável' },
    { campo: 'usuario', label: 'Usuários (vinculados)' }
  ];

  get isFiltroData() {
    return this.campoFiltro === 'data' || this.campoFiltro === 'data_conclusao';
  }

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.carregarChamados();
  }

  async carregarChamados() {
    this.carregando = true;
    try {
      let url = '/chamados?';
      const params: string[] = [];

      if (this.campoFiltro && this.campoFiltro !== 'data' && this.campoFiltro !== 'usuario') {
        if (this.valorFiltro) {
          params.push(`campo=${this.campoFiltro}&valor=${encodeURIComponent(this.valorFiltro)}`);
        }
      }

      if (this.campoFiltro === 'usuario') {
        if (this.valorFiltro) {
          params.push(`campo=criador_nome&valor=${encodeURIComponent(this.valorFiltro)}`);
        }
      }

      if (this.dataInicio) params.push(`data_inicio=${this.dataInicio}`);
      if (this.dataFim) params.push(`data_fim=${this.dataFim}`);

      url += params.join('&');
      const data = await this.api.get(url);
      this.chamados = [...data];
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  async pesquisar() {
    this.paginaAtual = 1;
    await this.carregarChamados();
  }

  async limparFiltros() {
    this.campoFiltro = '';
    this.valorFiltro = '';
    this.dataInicio = '';
    this.dataFim = '';
    this.paginaAtual = 1;
    await this.carregarChamados();
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
      for (let i = Math.max(2, atual - 1); i <= Math.min(total - 1, atual + 1); i++) {
        paginas.push(i);
      }
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