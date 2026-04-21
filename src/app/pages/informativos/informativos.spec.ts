import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Informativos } from './informativos';

describe('Informativos', () => {
  let component: Informativos;
  let fixture: ComponentFixture<Informativos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Informativos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Informativos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
