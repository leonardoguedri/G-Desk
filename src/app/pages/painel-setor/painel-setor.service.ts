import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ChamadoDTO {
  protocolo: string;
  data: string;
  instituicao: string;
  unidade: string;
  cliente: string;
  status: 'PENDENTE' | 'EXECUTANDO' | 'CONCLUIDO';
  executor: string;
  descricao: string;
  email: string;
  celular: string;
  setor: string;
}

@Injectable({ providedIn: 'root' })
export class PainelSetorService {

  getChamados(): Observable<ChamadoDTO[]> {
    return of([
      {
        protocolo: '202600001',
        data: '2026-02-01',
        instituicao: 'DETRAN',
        unidade: 'SEDE',
        cliente: 'João Silva',
        status: 'PENDENTE',
        executor: 'Admin',
        descricao: 'Link inoperante',
        email: 'joao@email.com',
        celular: '919999999',
        setor: 'DSR'
      },
      {
        protocolo: '202600002',
        data: '2026-02-02',
        instituicao: 'SESPA',
        unidade: 'CENTRAL',
        cliente: 'Maria Souza',
        status: 'CONCLUIDO',
        executor: 'Admin',
        descricao: 'Sistema normalizado',
        email: 'maria@email.com',
        celular: '919888888',
        setor: 'TI'
      }
    ]);
  }
}