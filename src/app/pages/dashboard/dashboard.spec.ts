import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type StatusChamado =
  | 'PENDENTE'
  | 'EXECUTANDO'
  | 'CONCLUIDO';

interface Chamado {
  protocolo: string;
  titulo: string;
  status: StatusChamado;
  setor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  filtroAtivo: StatusChamado | 'TODOS' = 'PENDENTE';
  busca = '';

  chamados: Chamado[] = [
    {
      protocolo: 'CH001',
      titulo: 'Computador não liga',
      status: 'PENDENTE',
      setor: 'TI',
    },
    {
      protocolo: 'CH002',
      titulo: 'Internet lenta',
      status: 'EXECUTANDO',
      setor: 'Redes',
    },
    {
      protocolo: 'CH003',
      titulo: 'Impressora não imprime',
      status: 'PENDENTE',
      setor: 'TI',
    },
    {
      protocolo: 'CH004',
      titulo: 'Sistema fora do ar',
      status: 'CONCLUIDO',
      setor: 'Sistemas',
    },
  ];

  get chamadosFiltrados(): Chamado[] {
    return this.chamados.filter((chamado) => {
      const matchFiltro =
        this.filtroAtivo === 'TODOS' ||
        chamado.status === this.filtroAtivo;

      const matchBusca =
        this.busca === '' ||
        chamado.protocolo
          .toLowerCase()
          .includes(this.busca.toLowerCase());

      return matchFiltro && matchBusca;
    });
  }

  setFiltro(filtro: StatusChamado | 'TODOS') {
    this.filtroAtivo = filtro;
  }

  abrirChamado(chamado: Chamado) {
    window.open(`/chamado/${chamado.protocolo}`, '_blank');
  }
}
