import { CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectorRef,
  ComponentFactoryResolver,
  ComponentRef,
  Directive,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  HostListener,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { I18nInterface, I18nService } from 'ng-devui/i18n';
import { PositionService } from 'ng-devui/position';
import { addClassToOrigin, removeClassFromOrigin } from 'ng-devui/utils';
import { DevConfigService, WithConfig } from 'ng-devui/utils/globalConfig';
import { fromEvent, Observable, of, Subject, Subscription } from 'rxjs';
import { debounceTime, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AutoCompleteConfig } from './auto-complete-config';
import { AutoCompletePopupComponent } from './auto-complete-popup.component';

@Directive({
  selector: '[dAutoComplete]',
  exportAs: 'autoComplete',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutoCompleteDirective),
      multi: true,
    },
  ],
})
export class AutoCompleteDirective implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @HostBinding('attr.autocomplete') autocomplete = 'off';
  @HostBinding('attr.autocapitalize') autocapitalize = 'off';
  @HostBinding('attr.autocorrect') autocorrect = 'off';
  @Input() disabled: boolean;
  @Input() cssClass: string;
  @Input() delay = 300;
  @Input() minLength: number;
  @Input() itemTemplate: TemplateRef<any>;
  @Input() noResultItemTemplate: TemplateRef<any>;
  @Input() searchingTemplate: TemplateRef<any>;
  @Input() set isSearching(isSearching) {
    if (this.popupRef && this.searchingTemplate) {
      const pop = this.popupRef.instance;
      pop.isSearching = isSearching;
      pop.searchingTemplate = this.searchingTemplate;
      if (isSearching) {
        pop.isOpen = true;
      }
    }
  }

  @Input() appendToBody = false;
  @Input() cdkOverlayOffsetY = 0; // ?????????????????????
  @Input() dAutoCompleteWidth: number;
  @Input() formatter: (item: any) => string;
  @Input() sceneType = ''; // sceneType???????????????select(?????????) suggest(??????)
  @Input() tipsText = ''; // ????????????
  /*
 overview: border none multiline single
 */
  @Input() overview: string;
  @Input() latestSource: any[]; // ????????????
  @Input() source: any[];
  @Input() valueParser: (item: any) => any;
  @Input() searchFn: (term: string, target?: AutoCompleteDirective) => Observable<any[]>;
  @Input() dropdown: boolean;
  @Input() maxHeight = 300;
  @Input() disabledKey: string;
  @Input() @WithConfig() showAnimation = true;
  /**
   *  ???????????????????????????????????????????????????
   */
  @Input() enableLazyLoad = false;
  @Input() allowEmptyValueSearch = false; // ???value????????????????????????????????????
  @Output() loadMore = new EventEmitter<any>();
  @Output() selectValue = new EventEmitter<any>();
  @Output() transInputFocusEmit = new EventEmitter<any>(); // input???????????????????????????
  @Output() changeDropDownStatus = new EventEmitter<any>();
  KEYBOARD_EVENT_NOT_REFRESH = ['escape', 'enter', 'arrowup', 'arrowdown', /*ie 10 edge */ 'esc', 'up', 'down'];
  popupRef: ComponentRef<AutoCompletePopupComponent>;

  private destroy$ = new Subject();
  i18nText: I18nInterface['autoComplete'];
  popTipsText = '';
  position: any;
  focus = false;

  private valueChanges: Observable<any[]>;
  private value: any;
  private placement = 'bottom-left';
  private subscription: Subscription;
  private onChange = (_: any) => null;
  private onTouched = () => null;

  constructor(
    private autoCompleteConfig: AutoCompleteConfig,
    private elementRef: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private componentFactoryResolver: ComponentFactoryResolver,
    private renderer: Renderer2,
    private injector: Injector,
    private positionService: PositionService,
    private changeDetectorRef: ChangeDetectorRef,
    private i18n: I18nService,
    private devConfigService: DevConfigService
  ) {
    this.minLength = this.autoCompleteConfig.autoComplete.minLength;
    this.itemTemplate = this.autoCompleteConfig.autoComplete.itemTemplate;
    this.noResultItemTemplate = this.autoCompleteConfig.autoComplete.noResultItemTemplate;
    this.formatter = this.autoCompleteConfig.autoComplete.formatter;
    this.valueParser = this.autoCompleteConfig.autoComplete.valueParser;
  }

  ngOnInit() {
    this.setI18nText();
    this.valueChanges = this.registerInputEvent(this.elementRef);
    // ???????????????input keyup
    this.subscription = this.valueChanges.subscribe((source) => this.onSourceChange(source));

    // ??????????????????popup?????????
    const factory = this.componentFactoryResolver.resolveComponentFactory(AutoCompletePopupComponent);
    this.popupRef = this.viewContainerRef.createComponent(factory, this.viewContainerRef.length, this.injector);

    this.fillPopup(this.source);

    if (!this.searchFn) {
      this.searchFn = (term) => {
        return of(this.source.filter((lang) => this.formatter(lang).toLowerCase().indexOf(term.toLowerCase()) !== -1));
      };
    }

    // ?????????????????????????????????????????????????????????
    this.popupRef.instance.registerOnChange((item) => {
      if (item.type === 'loadMore') {
        this.loadMore.emit(item.value);
        return;
      }
      const value = this.valueParser(item.value);
      this.writeValue(value);
      this.onChange(value);
      this.hidePopup();
      this.selectValue.emit(item.value);
      if (this.overview && this.overview !== 'single') {
        setTimeout(() => {
          // ?????????????????????????????????????????????????????????????????????????????????????????????
          this.restLatestSource();
        }, 0);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes && this.popupRef && changes.source) {
      this.fillPopup(this.source);
    }
  }

  setI18nText() {
    this.i18nText = this.i18n.getI18nText().autoComplete;
    // this.i18nLang = this.i18n.getI18nText().locale; // ??????????????????????????????
    this.i18n
      .langChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.i18nText = data.autoComplete;
        // this.i18nLang = data.locale; // ??????????????????????????????
      });
  }

  restLatestSource() {
    if (this.latestSource && this.latestSource.length > 0) {
      this.writeValue('');
      this.clearInputValue();
      this.showLatestSource();
    }
  }

  // ???????????????input keyup
  onSourceChange(source) {
    if (!this.elementRef.nativeElement.value) {
      if (this.sceneType !== 'select' && !this.allowEmptyValueSearch) {
        // ?????????????????????????????????
        this.showLatestSource();
      } else {
        this.showSource(source, true, true);
      }
    } else {
      this.showSource(source, true, true);
    }
  }

  private showLatestSource() {
    let tempSource = [];
    if (this.latestSource && this.latestSource.length > 0) {
      this.searchFn('').subscribe((source) => {
        const t = this.latestSource;
        tempSource = t.filter((data) => {
          if (!data.label) {
            return source.find((item) => item === data);
          } else {
            return source.find((item) => item.label === data.label);
          }
        });

        const pop = this.popupRef.instance;
        pop.reset();
        this.popTipsText = this.i18nText.latestInput;
        this.fillPopup(tempSource);
        this.openPopup();
        this.changeDetectorRef.markForCheck();
      });
    }

    if (tempSource.length <= 0) {
      this.hidePopup();
    }
  }

  private showSource(source, setOpen, isReset) {
    if ((source && source.length) || this.noResultItemTemplate) {
      const pop = this.popupRef.instance;
      if (isReset) {
        pop.reset();
      }
      this.popTipsText = this.tipsText || '';
      this.fillPopup(source, this.value);
      if (setOpen) {
        this.openPopup();
      }
      this.changeDetectorRef.markForCheck();
    } else {
      this.hidePopup();
    }
  }

  public openPopup(activeIndex = 0) {
    this.popupRef.instance.activeIndex = activeIndex;
    this.popupRef.instance.isOpen = true;
    this.popupRef.instance.disabled = this.disabled;
    addClassToOrigin(this.elementRef);
    this.changeDropDownStatus.emit(true);
  }

  writeValue(obj): void {
    this.value = this.formatter(obj) || '';
    this.writeInputValue(this.value);
  }

  registerOnChange(fn): void {
    this.onChange = fn;
  }

  registerOnTouched(fn): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', isDisabled);
    if (this.popupRef) {
      this.popupRef.instance.setDisabledState(isDisabled);
    }
  }

  ngOnDestroy() {
    this.unSubscription();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('focus', ['$event'])
  onFocus($event) {
    this.focus = true;
    this.transInputFocusEmit.emit({
      focus: true,
      popupRef: this.popupRef,
    });
    const isOpen = this.sceneType !== 'select';
    if (this.sceneType === 'select') {
      this.searchFn('').subscribe((source) => {
        this.showSource(source, isOpen, false);
      });
    }
  }

  @HostListener('blur', ['$event'])
  onBlur($event) {
    this.focus = false;
    // this.hidePopup();    // TODO: ????????????????????????????????????????????????????????????click???????????????blur???????????????????????????
    this.onTouched();
  }

  @HostListener('keydown.esc', ['$event'])
  onEscKeyup($event) {
    this.hidePopup();
  }

  @HostListener('keydown.Enter', ['$event'])
  onEnterKeyDown($event) {
    if (!this.popupRef.instance.source || !this.popupRef.instance.isOpen) {
      return;
    }
    if (this.popupRef) {
      this.popupRef.instance.selectCurrentItem($event);
    }
  }

  @HostListener('keydown.ArrowUp', ['$event'])
  onArrowUpKeyDown($event) {
    if (this.popupRef) {
      $event.preventDefault();
      $event.stopPropagation();
      this.popupRef.instance.prev();
    }
  }

  @HostListener('keydown.ArrowDown', ['$event'])
  onArrowDownKeyDown($event) {
    if (this.popupRef) {
      $event.preventDefault();
      $event.stopPropagation();
      this.popupRef.instance.next();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick($event: Event) {
    if (this.focus) {
      this.transInputFocusEmit.emit({
        focus: this.focus,
        popupRef: this.popupRef,
      });
    }

    // TODO: sceneType???'select'??????????????????????????????????????????????????????????????????
    const hostElement = this.elementRef.nativeElement;
    if (this.popupRef && this.popupRef.instance.isOpen) {
      if ((!hostElement.contains($event.target) && this.sceneType === 'select') || this.sceneType !== 'select') {
        this.hidePopup();
      }
      if (!hostElement.contains($event.target)) {
        this.transInputFocusEmit.emit({
          focus: false,
          popupRef: this.popupRef,
        });
      }
    } else if (hostElement.contains($event.target) && this.sceneType !== 'select') {
      if (!this.elementRef.nativeElement.value && !this.allowEmptyValueSearch) {
        this.showLatestSource();
      } else {
        this.searchFn(this.elementRef.nativeElement.value).subscribe((source) => {
          this.showSource(source, true, false);
        });
      }
    }
  }

  public hidePopup() {
    if (this.popupRef) {
      this.popupRef.instance.isOpen = false;
      removeClassFromOrigin(this.elementRef);
      this.changeDropDownStatus.emit(false);
    }
  }

  private fillPopup(source?, term?: string) {
    this.position = this.positionService.position(this.elementRef.nativeElement);
    const pop = this.popupRef.instance;
    pop.source = source;
    pop.maxHeight = this.maxHeight;
    pop.term = term;
    pop.disabledKey = this.disabledKey;
    pop.enableLazyLoad = this.enableLazyLoad;
    pop.disabled = this.disabled;
    if (this.appendToBody) {
      pop.appendToBody = true;
      pop.origin = new CdkOverlayOrigin(this.elementRef);
      pop.width = this.dAutoCompleteWidth ? this.dAutoCompleteWidth : this.elementRef.nativeElement.offsetWidth;
      pop.cdkOverlayOffsetY = this.cdkOverlayOffsetY;
    } else {
      pop.appendToBody = false;
    }
    ['formatter', 'itemTemplate', 'noResultItemTemplate', 'cssClass', 'dropdown',
      'popTipsText', 'position', 'overview', 'showAnimation'].forEach((key) => {
      if (this[key] !== undefined) {
        pop[key] = this[key];
      }
    });
  }

  private writeInputValue(value) {
    this.renderer.setProperty(this.elementRef.nativeElement, 'value', value);
  }

  private clearInputValue() {
    this.renderer.setProperty(this.elementRef.nativeElement, 'value', '');
  }

  private unSubscription() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  onTermChange(term) {
    this.value = term;
    if (this.popupRef) {
      this.popupRef.instance.term = term;
    }
    this.onChange(term);
  }

  private registerInputEvent(elementRef: ElementRef) {
    return fromEvent(elementRef.nativeElement, 'input').pipe(
        map((e: any) => e.target.value),
        filter((term) => !this.disabled && this.searchFn && term.length >= 0),
        debounceTime(this.delay),
        tap((term) => this.onTermChange(term)),
        switchMap((term) => this.searchFn(term, this))
      );

  }
}
