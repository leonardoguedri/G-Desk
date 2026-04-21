import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelSetorComponent } from './painel-setor';

describe('PainelSetor', () => {
  let component: PainelSetorComponent;
  let fixture: ComponentFixture<PainelSetorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainelSetorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PainelSetorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
