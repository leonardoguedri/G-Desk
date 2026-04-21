import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  visualizacao: 'lista' | 'bloco' = 'lista';
  filtro: 'geral' | 'pendente' | 'execucao' | 'concluido' = 'geral';
  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');
  chamados: Chamado[] = [];
  carregando = true;

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
      const data = await this.api.get('/chamados');
      this.chamados = [...data];
    } catch (e) {
      console.error('Erro ao carregar chamados:', e);
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  abrirDetalhe(id: number) {
    this.router.navigate(['/chamado', id]);
  }

  get chamadosFiltrados() {
    return this.chamados.filter(c => {
      if (this.filtro === 'geral') return true;
      if (this.filtro === 'pendente') return c.status === 'Pendente';
      if (this.filtro === 'execucao') return c.status === 'Em Execução';
      if (this.filtro === 'concluido') return c.status === 'Concluído';
      return true;
    });
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