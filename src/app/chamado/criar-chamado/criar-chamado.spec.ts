import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CriarChamado } from './criar-chamado';

describe('CriarChamado', () => {
  let component: CriarChamado;
  let fixture: ComponentFixture<CriarChamado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriarChamado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CriarChamado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
