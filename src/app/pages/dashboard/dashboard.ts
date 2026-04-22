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
  setor_destino: string;
  categoria: string;
  responsavel: string;
  status: string;
  data_criacao: string;
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
  filtro: 'geral' | 'pendente' | 'execucao' | 'concluido' = 'geral';
  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');

  chamados: Chamado[] = [];
  instituicoes: any[] = [];
  carregando = true;

  filtroAvancado = {
    protocolo: '',
    instituicao: '',
    categoria: '',
    dataInicio: '',
    dataFim: ''
  };

  filtrosAbertos = false;

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.carregarChamados(),
      this.carregarInstituicoes()
    ]);
  }

  async carregarChamados() {
    this.carregando = true;
    try {
      const data = await this.api.get('/chamados');
      this.chamados = [...data];
    } catch (e) {
      console.error('Erro ao carregar chamados:', e);
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  async carregarInstituicoes() {
    try {
      this.instituicoes = await this.api.get('/instituicoes');
    } catch (e) {
      console.error('Erro ao carregar instituições:', e);
    }
  }

  limparFiltros() {
    this.filtroAvancado = {
      protocolo: '',
      instituicao: '',
      categoria: '',
      dataInicio: '',
      dataFim: ''
    };
    this.cdr.detectChanges();
  }

  get chamadosFiltrados() {
    return this.chamados.filter(c => {

      // FILTRO DE ABAS
      if (this.filtro === 'pendente' && c.status !== 'Pendente') return false;
      if (this.filtro === 'execucao' && c.status !== 'Em Execução') return false;
      if (this.filtro === 'concluido' && c.status !== 'Concluído') return false;

      // FILTROS AVANÇADOS
      if (this.filtroAvancado.protocolo &&
        !c.protocolo.toLowerCase().includes(this.filtroAvancado.protocolo.toLowerCase())) {
        return false;
      }

      if (this.filtroAvancado.instituicao &&
        c.instituicao !== this.filtroAvancado.instituicao) {
        return false;
      }

      if (this.filtroAvancado.categoria &&
        !c.categoria?.toLowerCase().includes(this.filtroAvancado.categoria.toLowerCase())) {
        return false;
      }

      if (this.filtroAvancado.dataInicio) {
        const dataInicio = new Date(this.filtroAvancado.dataInicio);
        const partes = c.data_criacao.split('/');
        const dataChamado = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
        if (dataChamado < dataInicio) return false;
      }

      if (this.filtroAvancado.dataFim) {
        const dataFim = new Date(this.filtroAvancado.dataFim);
        const partes = c.data_criacao.split('/');
        const dataChamado = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
        if (dataChamado > dataFim) return false;
      }

      return true;
    });
  }

  abrirDetalhe(id: number) {
    this.router.navigate(['/chamado', id]);
  }

  mudarVisualizacao(tipo: 'lista' | 'bloco') {
    this.visualizacao = tipo;
  }

  setFiltro(f: any) {
    this.filtro = f;
    this.cdr.detectChanges();
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
      c.setor_destino, c.categoria, c.responsavel || '-', c.data_criacao
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chamados.csv';
    link.click();
  }
}