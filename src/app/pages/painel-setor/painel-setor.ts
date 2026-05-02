import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Chamado {
  id: number;
  protocolo: string;
  titulo: string;
  instituicao: string;
  setor_destino: string;
  categoria: string;
  responsavel_id: number;
  status: string;
  data_criacao: string;  
}


@Component({
  selector: 'app-painel-setor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './painel-setor.html',
  styleUrls: ['./painel-setor.css']
})
export class PainelSetorComponent implements OnInit {

  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');
  chamados: Chamado[] = [];
  carregando = true;
  filtro: 'entrada' | 'meus' | 'todos' = 'entrada';

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
      const setor = this.usuarioLogado.setor;
      if (!setor) {
        this.chamados = [];
        return;
      }
      const data = await this.api.get(`/chamados/setor/${encodeURIComponent(setor)}`);
      this.chamados = Array.isArray(data) ? [...data] : [];
    } catch (e) {
      console.error('Erro:', e);
      this.chamados = [];
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

get chamadosFiltrados() {
  const statusOrdem: any = { 'Pendente': 1, 'Em Execução': 2, 'Concluído': 3 };

  let lista = this.chamados.filter(c => {
    if (this.filtro === 'entrada') return c.status === 'Pendente';
    if (this.filtro === 'meus') return c.responsavel_id === this.usuarioLogado.id;
    return true;
  });

  if (this.ordemCampo) {
    lista = [...lista].sort((a: any, b: any) => {
      let va = a[this.ordemCampo] || '';
      let vb = b[this.ordemCampo] || '';

      if (this.ordemCampo === 'status') {
        return ((statusOrdem[va] || 0) - (statusOrdem[vb] || 0)) * this.ordemDirecao;
      }

      if (this.ordemCampo === 'data_criacao') {
        const toDate = (d: string) => {
          if (!d) return 0;
          const p = d.split('/');
          return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
        };
        return (toDate(va) - toDate(vb)) * this.ordemDirecao;
      }

      return va.toString().localeCompare(vb.toString()) * this.ordemDirecao;
    });
  }

  return lista;
}

  get total() { return this.chamados.length; }
  get pendentes() { return this.chamados.filter(c => c.status === 'Pendente').length; }
  get emExecucao() { return this.chamados.filter(c => c.status === 'Em Execução').length; }
  get concluidos() { return this.chamados.filter(c => c.status === 'Concluído').length; }

  get porcentagemPendentes() {
    return this.total ? Math.round((this.pendentes / this.total) * 100) : 0;
  }

  get porcentagemExecucao() {
    return this.total ? Math.round((this.emExecucao / this.total) * 100) : 0;
  }

  get porcentagemConcluidos() {
    return this.total ? Math.round((this.concluidos / this.total) * 100) : 0;
  }

  setFiltro(f: 'entrada' | 'meus' | 'todos') {
    this.filtro = f;
    this.cdr.detectChanges();
  }

  abrirDetalhe(id: number) {
    this.router.navigate(['/chamado', id]);
  }

  getStatusClass(status: string) {
    if (status === 'Pendente') return 'pendente';
    if (status === 'Em Execução') return 'execucao';
    if (status === 'Concluído') return 'concluido';
    return '';
  }

  exportarCSV() {
    const headers = ['Protocolo', 'Status', 'Instituição', 'Setor', 'Categoria', 'Data'];
    const rows = this.chamadosFiltrados.map(c => [
      c.protocolo, c.status, c.instituicao,
      c.setor_destino, c.categoria, c.data_criacao
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'painel-setor.csv';
    link.click();
  }

ordemCampo = '';
ordemDirecao = 1;

ordenarPor(campo: string) {
  if (this.ordemCampo === campo) {
    this.ordemDirecao *= -1;
  } else {
    this.ordemCampo = campo;
    this.ordemDirecao = 1;
  }
  this.cdr.detectChanges();
}

  
}