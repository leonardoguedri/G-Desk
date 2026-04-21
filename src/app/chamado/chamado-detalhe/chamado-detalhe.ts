import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chamado-detalhe',
  standalone: true,
  template: `
    <h2>Detalhe do Chamado</h2>
    <p>Protocolo: {{protocolo}}</p>
  `,
})
export class ChamadoDetalhe {
  protocolo: string;

  constructor(private route: ActivatedRoute) {
    this.protocolo = this.route.snapshot.params['protocolo'];
  }
}
