import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface LinkExterno {
  titulo: string;
  descricao: string;
  url: string;
  categoria: string;
}

@Component({
  selector: 'app-paginas-externas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginas-externas.html',
  styleUrls: ['./paginas-externas.css'],
})
export class PaginasExternasComponent {
  links: LinkExterno[] = [
    {
      titulo: 'Portal DETRAN',
      descricao: 'Acesso ao sistema oficial do DETRAN',
      url: 'https://www.detran.pa.gov.br',
      categoria: 'Governamental',
    },
    {
      titulo: 'Receita Federal',
      descricao: 'Serviços e consultas fiscais',
      url: 'https://www.gov.br/receitafederal',
      categoria: 'Governamental',
    },
    {
      titulo: 'Painel Equatorial',
      descricao: 'Monitoramento de energia',
      url: 'https://www.equatorialenergia.com.br',
      categoria: 'Serviços',
    },
    {
      titulo: 'Documentação Interna',
      descricao: 'Guias e procedimentos internos',
      url: '#',
      categoria: 'Interno',
    },
  ];

  categorias(): string[] {
    return [...new Set(this.links.map(l => l.categoria))];
  }

  linksPorCategoria(categoria: string) {
    return this.links.filter(l => l.categoria === categoria);
  }

  abrir(link: string) {
    window.open(link, '_blank');
  }
}
