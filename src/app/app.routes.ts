import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { InformativosComponent } from './pages/informativos/informativos';
import { PainelSetorComponent } from './pages/painel-setor/painel-setor';
import { PaginasExternasComponent } from './pages/paginas-externas/paginas-externas';
import { LoginComponent } from './auth/login/login';
import { CriarChamadoComponent } from './chamado/criar-chamado/criar-chamado';
import { authGuard } from './auth/auth.guard';
import { ChamadoDetalheComponent } from './pages/chamado-detalhe/chamado-detalhe';
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'informativos', component: InformativosComponent },
      { path: 'painel-setor', component: PainelSetorComponent },
      { path: 'paginas-externas', component: PaginasExternasComponent },
      { path: 'criar-chamado', component: CriarChamadoComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'chamado/:id', component: ChamadoDetalheComponent },
      { path: 'configuracoes', component: ConfiguracoesComponent },
    ],
  },
];