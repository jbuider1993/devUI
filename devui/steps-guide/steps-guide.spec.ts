// tslint:disable: max-line-length
import { Component, DebugElement, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DomHelper } from '../utils/testing/dom-helper';
import { StepsGuideModule } from './steps-guide.module';
import { StepsGuideService } from './steps-guide.service';

const eventList = [];

class CommonFunctions {
  static tickEvent(el, event, fixture, delay?: number): void {
    el.dispatchEvent(event);
    fixture.detectChanges();
    if (delay) {
      tick(delay);
    } else {
      tick();
    }
    fixture.detectChanges();
  }

  static flushEvent(el, event, fixture): void {
    el.dispatchEvent(event);
    fixture.detectChanges();
    flush();
    fixture.detectChanges();
  }

  static event(str) {
    let res = eventList.find(e => e.type === str);
    if (!res) {
      res = new Event(str);
      eventList.push(res);
    }
    return res;
  }
}

class TestFunctions {
  static guideCorrect(cls, str) {
    expect(document.querySelector('.devui-step-item').classList.contains(cls)).toBeTruthy();
    expect(document.querySelector('.devui-title').textContent.trim().includes(str)).toBeTruthy();
  }
}

@Component({
  template: `
    <div class="place-holder" #placeHolder><div class="place-holder-sub"></div></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="0"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="1"
      [dStepsGuidePosition]="positions[1]"
      [leftFix]="leftFix"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="2"
      [dStepsGuidePosition]="positions[2]"
      [topFix]="topFix"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="3"
      [dStepsGuidePosition]="positions[3]"
      [zIndex]="zIndex"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="4"
      [dStepsGuidePosition]="positions[4]"
      [observerDom]="observerDom"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="5"
      [dStepsGuidePosition]="positions[5]"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="6"
      [dStepsGuidePosition]="positions[6]"
      (operateChange)="operateChange($event)"
    ></div>
    <div
      class="devui-guide"
      dStepsGuide
      [pageName]="'basic'"
      [steps]="steps"
      [stepIndex]="7"
      [position]="positions[7]"
      (operateChange)="operateChange($event)"
    ></div>
  `,
  styles: [`
    .devui-guide {
      width: 40px;
      height: 20px;
      background-color: #8a8e99;
      display: inline-block;
      margin: 0 10px;
      border-radius: 2px;
      vertical-align: middle;
    }

    .place-holder {
      width: 500px;
      border: 1px solid #000;
    }
  `]
})
class TestStepsGuideComponent implements OnInit {
  steps = [
    {
      title: 'default: top',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'top-left',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'top-right',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'bottom',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'bottom-left',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'bottom-right',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'left',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    },
    {
      title: 'right',
      content: '??????????????????????????????????????????????????????????????????????????????????????????'
    }
  ];
  currentStep: number;
  currentStepOutPut: any;
  positions = ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right', 'left', 'right'];
  leftFix: number;
  topFix: number;
  zIndex: number;
  observerDom: HTMLElement;
  @ViewChild('placeHolder') placeHolder: ElementRef;

  constructor(private stepsGuideService: StepsGuideService) {}

  ngOnInit() {
    this.stepsGuideService.currentIndex.subscribe((index) => (this.currentStep = index));
  }

  operateChange(e) {
    this.currentStepOutPut = e;
    if (e.clickType === 'close') {
      this.stepsGuideService.showGuide(false);
    }
  }

  toggle = (show) => {
    this.stepsGuideService.showGuide(show);
  }

  setIndex = (index) => {
    this.stepsGuideService.setCurrentIndex(index);
  }

  setPlaceHolderHeight = (height: number) => {
    this.placeHolder.nativeElement.style.height = `${height}px`;
  }
}

describe('steps guide basic', () => {
  let fixture: ComponentFixture<TestStepsGuideComponent>;
  let debugEl: DebugElement;
  let component: TestStepsGuideComponent;
  let domHelper: DomHelper<TestStepsGuideComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [StepsGuideModule, FormsModule],
      declarations: [TestStepsGuideComponent]
    }).compileComponents();
  }));

  describe('basic', () => {
    beforeEach(fakeAsync(() => {
      fixture = TestBed.createComponent(TestStepsGuideComponent);
      debugEl = fixture.debugElement;
      component = debugEl.componentInstance;

      domHelper = new DomHelper(fixture);
      component.toggle(false);
    }));

    afterEach(() => {
      component.toggle(false);
    });

    it('should show and basic function works', fakeAsync(() => {
      component.toggle(true);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      // ??????stepsGuide??????????????????
      expect(domHelper.judgeAppendToBodyStyleClasses([
        '.devui-step-item',
          '.devui-shining-dot', '.devui-shining-plus', '.devui-arrow', '.devui-guide-container',
            '.devui-title', '.icon-close', '.devui-content', '.devui-ctrl',
              '.devui-guide-btn'
      ])).toBeTruthy();
      // ?????????????????????????????????????????????????????????????????????
      component.steps.map((step, index) => {
        if (index <= 0) { // ????????????????????????
          TestFunctions.guideCorrect(component.positions[index], step.title);
          CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[0], CommonFunctions.event('click'), fixture);
          TestFunctions.guideCorrect(component.positions[index + 1], component.steps[index + 1].title);
        } else if (index >= component.steps.length - 1) { // ???????????????????????????
          TestFunctions.guideCorrect(component.positions[index], step.title);
          CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[0], CommonFunctions.event('click'), fixture);
          TestFunctions.guideCorrect(component.positions[index - 1], component.steps[index - 1].title);
          CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[1], CommonFunctions.event('click'), fixture);
          TestFunctions.guideCorrect(component.positions[index], step.title);
        } else {
          TestFunctions.guideCorrect(component.positions[index], step.title);
          CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[0], CommonFunctions.event('click'), fixture);
          TestFunctions.guideCorrect(component.positions[index - 1], component.steps[index - 1].title);
          let currentBtn = 1;
          if (document.querySelector('.devui-guide-btn').children.length === 1) {
            currentBtn = 0;
          }
          CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[currentBtn], CommonFunctions.event('click'), fixture);
          CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[1], CommonFunctions.event('click'), fixture);
          TestFunctions.guideCorrect(component.positions[index + 1], component.steps[index + 1].title);
        }
      });
      // ????????????????????????
      CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[1], CommonFunctions.event('click'), fixture);
      expect(document.querySelector('.devui-step-item')).toBeFalsy();
    }));

    it('should services control show and hide', fakeAsync(() => {
      component.toggle(true);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(document.querySelector('.devui-step-item')).toBeTruthy();
      component.toggle(false);
      expect(document.querySelector('.devui-step-item')).toBeFalsy();
    }));

    it('should leftFix & topFix & zIndex works', fakeAsync(() => {
      component.leftFix = 10;
      component.topFix = 10;
      component.zIndex = 1200;
      component.setIndex(1);
      component.toggle(true);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(document.querySelector('.devui-step-item')['style'].marginLeft).toBe('10px');
      CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[1], CommonFunctions.event('click'), fixture);
      expect(document.querySelector('.devui-step-item')['style'].marginTop).toBe('10px');
      CommonFunctions.tickEvent(document.querySelector('.devui-guide-btn').children[1], CommonFunctions.event('click'), fixture);
      expect(document.querySelector('.devui-step-item')['style'].zIndex).toBe('1200');
    }));

    // TODO: ???????????????MutationObserver???callback????????????????????????????????????
    xit('should observerDom works', fakeAsync(() => {
      fixture.detectChanges();
      component.observerDom = debugEl.query(By.css('.place-holder')).nativeElement;
      component.setIndex(4);
      component.toggle(true);
      flush();
      fixture.detectChanges();

      let currentTop = (document.querySelector('.devui-step-item') as HTMLElement).offsetTop;
      component.setPlaceHolderHeight(100);
      currentTop = currentTop + 100;
      tick(500);
      fixture.detectChanges();
      expect((document.querySelector('.devui-step-item') as HTMLElement).offsetTop).toBe(currentTop);
    }));
  });
});
