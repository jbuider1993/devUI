import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from '../button';
import { PopoverModule } from './popover.module';
@Component({
  template: `
    <d-button
      dPopover
      [popType]="'default'"
      [content]="content"
      [position]="direction"
      [controlled]="true"
      [showAnimation]="true"
      [appendToBody]="true"
    >
      default
    </d-button>
    <d-button
      dPopover
      [content]="hoverContent"
      [popType]="'warning'"
      [position]="'top'"
      [controlled]="true"
      [showAnimation]="true"
      [trigger]="'hover'"
      [hoverDelayTime]="hoverDelayTime"
      [visible]="hoverVisible"
      [appendToBody]="false"
    >
      warning
    </d-button>
  `
})
class TestPopoverBasicComponent {
  direction = 'left';
  content = 'left';

  hoverContent = 'hover';
  hoverVisible = true;
  hoverDelayTime = 0;
}

describe('popover', () => {

  afterEach(() => {
    const popOverEl = document.getElementsByTagName('d-popover');
    for (let i = 0; i < popOverEl.length; i++) {
      popOverEl[i].parentNode.removeChild(popOverEl[i]);
    }
  });

  describe('popover basic', () => {
    let testComponent: TestPopoverBasicComponent;
    let fixture: ComponentFixture<TestPopoverBasicComponent>;
    let debugEle: DebugElement;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [PopoverModule, ButtonModule, BrowserAnimationsModule],
        declarations: [TestPopoverBasicComponent]
      }).compileComponents();
    });

    beforeEach(() => {
      fixture = TestBed.createComponent(TestPopoverBasicComponent);
      testComponent = fixture.componentInstance;
      debugEle = fixture.debugElement;
      fixture.detectChanges();
    });

    describe('Popover basic demo has created successfully', () => {

      it('Popover basic should create popover testComponent', () => {
        expect(testComponent).toBeTruthy();
      });

      /* ????????????????????? */
      it('Popover basic should not create popover popoverComponent at original state ', () => {
        expect(debugEle.query(By.css('d-popover'))).toBeNull();
      });

      /* ?????????????????????????????? */
      it('Mouse event should open or hide the popover', () => {
        const config = ['left', 'right', 'bottom', 'top'];
        const buttonEle = debugEle.query(By.css('d-button')).nativeElement;

        for (const i in config) {
          if (config.hasOwnProperty(i)) {  // use if to fix tslint error
            if (i === '0') { // TODO:??????????????????destroy?????????????????????????????????????????????
              testComponent.direction = config[i];
              testComponent.content = config[i];
              fixture.detectChanges();
              document.dispatchEvent(new Event('click'));
              fixture.detectChanges();
              buttonEle.dispatchEvent(new Event('click'));
              fixture.detectChanges();

              expect(document.querySelector('d-popover.' + config[i] + ' .devui-popover-content').textContent).toBe(config[i]);
            }
          }
        }
      });

      // ??hover?????????????????????????????????????????????mouseleave
      it('Mouse hover can open popover content', fakeAsync(() => {
        const buttonEle = debugEle.queryAll(By.css('d-button'))[1].nativeElement;

        buttonEle.dispatchEvent(new Event('mouseenter'));
        tick(150);
        fixture.detectChanges();

        expect(debugEle.query(By.css('d-popover .devui-popover-content')).nativeElement.textContent).toBe('hover');

        testComponent.hoverContent = 'hover1';
        fixture.detectChanges();
        expect(debugEle.query(By.css('d-popover .devui-popover-content')).nativeElement.textContent).toBe('hover1');

        buttonEle.dispatchEvent(new Event('mouseleave'));
        tick(100);
        fixture.detectChanges();

        document.dispatchEvent(new Event('click'));
        fixture.detectChanges();

        testComponent.hoverVisible = false;
        fixture.detectChanges();

        testComponent.hoverDelayTime = 100;
        fixture.detectChanges();
        buttonEle.dispatchEvent(new Event('mouseenter'));
        tick(150);
        fixture.detectChanges();
        expect(debugEle.query(By.css('d-popover .devui-popover-content')).nativeElement.textContent).toBe('hover1');
        // ??TODO:??mouseleave/blur/visible=false?????????????????????destroy???????????????????????????????????????????????????????????????????????????????????????????????????????????????
        // expect(debugEle.query(By.css('d-popover .devui-popover-content')).nativeElement.textContent).toBe('hover1');
      }));

    });
  });

});
