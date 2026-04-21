import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Chamado } from './chamado';

describe('Chamado', () => {
  let component: Chamado;
  let fixture: ComponentFixture<Chamado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chamado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Chamado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
