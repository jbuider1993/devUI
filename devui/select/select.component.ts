import {
  CdkConnectedOverlay, CdkOverlayOrigin, ConnectedOverlayPositionChange,
  ConnectedPosition, VerticalConnectionPos
} from '@angular/cdk/overlay';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  forwardRef, HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { I18nInterface, I18nService } from 'ng-devui/i18n';
import {
  addClassToOrigin,
  AppendToBodyDirection,
  AppendToBodyDirectionsConfig,
  fadeInOut,
  formWithDropDown,
  removeClassFromOrigin
} from 'ng-devui/utils';
import { DevConfigService, WithConfig } from 'ng-devui/utils/globalConfig';
import { WindowRef } from 'ng-devui/window-ref';
import { BehaviorSubject, fromEvent, Observable, of, Subscription } from 'rxjs';
import { debounceTime, filter, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'd-select',
  templateUrl: './select.component.html',
  styleUrls: [`./select.component.scss`],
  exportAs: 'select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  animations: [
    fadeInOut
  ],
  preserveWhitespaces: false,
})
export class SelectComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy, OnChanges {

  get isOpen() {
    return this._isOpen;
  }

  set isOpen(value) {
    this._isOpen = value;
    this.toggleChange.emit(value);
    this.setDocumentClickListener();
    if (this.selectWrapper) {
      this.dropDownWidth = this.width ? this.width : (this.selectWrapper.nativeElement.offsetWidth);
    }
    if (value) {
      addClassToOrigin(this.selectWrapper);
      setTimeout(() => {
        this.startAnimation = true;
        this.changeDetectorRef.detectChanges();
      });
    } else {
      removeClassFromOrigin(this.selectWrapper);
      this.onTouch();
    }
  }
  /**
   * ???????????????????????????????????????Array<string>, Array<{key: value}>
   */
  @Input() options = [];
  /**
   * ????????????????????????????????????
   */
  @Input() isSearch = false;
  /**
   * ????????????????????????????????????????????????
   */
  @Input() toggleOnFocus = false;
  /**
   * ?????????????????????????????????????????????px??????????????????
   */
  @Input() scrollHight = '300px';
  /**
   * ????????????????????????css
   */
  @Input() highlightItemClass = 'active';
  /**
   * ?????????????????????options????????????Array<{key: value}??????????????????????????????options????????????????????????????????????
   */
  @Input() filterKey: string;
  /**
   * ??????????????????????????????
   */
  @Input() multiple: boolean;
  /**
   * ??????????????????????????????
   */
  @Input() isSelectAll = false;
  /**
   * ??????????????????????????????
   */
  @Input() readonly = true;
  /**
   * ??????????????????????????????
   */
  @Input() size: '' | 'sm' | 'lg';
  /**
   * ??????????????????appendToBody
   */
  @Input() appendToBody = false;
  /**
 * ????????????cdk??????overlay Positions?????????
 */
  @Input() appendToBodyDirections: Array<AppendToBodyDirection | ConnectedPosition> = [
    'rightDown', 'leftDown', 'rightUp', 'leftUp'
  ];
  /**
   * ????????????cdk??????origin width
   */
  @Input() width: number;
  /**
   * ????????????????????????
   */
  @Input() templateItemSize: number; // ??????itemSize???appendToBody???true
  /**
   * ?????????????????????????????????
   */
  @Input() disabled = false;
  /**
   * ????????????????????????????????????
   */
  @Input() placeholder = '';
  @Input() searchPlaceholder = '';
  /**
   * ????????????????????????????????????????????????????????????????????????????????????
   *  ?????????????????????id???option?????????id?????????????????????????????????????????????????????????
   *  ?????????????????????
   *  search = (term) => {
   *    return of(
   *     [Lily, May, Jorsh, Shiwa, Nanth]
   *     .map((option, index) => ({id: index, option: option}))
   *     .filter(item => item.option.name.toLowerCase().indexOf(term.toLowerCase()) !== -1)
   *   );
   *  }
   */
  @Input() searchFn: (term: string) => Observable<Array<{ id: string | number; option: any }>>;
  /**
   * ????????????????????????????????????????????????????????????filterKey????????????????????????
   */
  @Input() valueParser: (item: any) => any;
  /**
   * ??????????????????????????????????????????????????????????????????filterKey????????????????????????
   */
  @Input() formatter: (item: any) => string;
  @Input() direction: 'up' | 'down' | 'auto' = 'down';
  @Input() overview: 'border' | 'underlined' = 'border';

  /**
   *  ????????????????????????clear??????????????????????????????????????????
   */
  @Input() allowClear = false;

  get isClearIconShow() {
    return this.allowClear && !this.multiple && !this.disabled && this.value;
  }

  @Input() color;
  /**
   *  ???????????????????????????????????????????????????
   */
  @Input() enableLazyLoad = false;

  /**
   * ??????????????????
   */
  @Input() virtualScroll;

  /**
   * ?????????????????????????????????ContentChild
   */
  @Input() inputItemTemplate: TemplateRef<any>;

  @ContentChild(TemplateRef) itemTemplate: TemplateRef<any>;

  /**
   * ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????(ngModelChange)??????
   */
  @Output() valueChange = new EventEmitter<any>();
  i18nCommonText: I18nInterface['common'];
  i18nSubscription: Subscription;
  /**
   * select??????toggle???????????????true???false
   */
  @Output() toggleChange = new EventEmitter<any>();

  @Output() loadMore = new EventEmitter<any>();

  @Input() extraConfig: {
    labelization?: {
      // ?????????????????????????????????????????????????????????????????????
      enable: boolean; // ????????????false
      overflow?: 'normal' | 'scroll-y' | 'multiple-line' | string; // ????????????''
      containerMaxHeight?: string; // ?????????1.8em
      containnerMaxHeight?: string;  // ?????????1.8em, ?????????
      labelMaxWidth?: string; // ??????100%
    };
    selectedItemWithTemplate?: {
      // ???????????????????????????????????????template????????????????????????????????????????????????template??????
      enable: boolean; // ????????????false
    };
    [feature: string]: any;
  };

  /**
   * ?????????????????????options????????????Array<{key: value}??????????????????????????????options???????????????????????????????????????key
   */
  @Input() optionDisabledKey = '';
  /**
   * ?????????????????????options????????????Array<{key: value}??????????????????????????????options????????????????????????????????????key
   */
  @Input() optionImmutableKey = '';
  /**
   * ?????????????????????????????????
   */
  @Input() noResultItemTemplate: TemplateRef<any>;
  /**
   * ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   */
  @Input() keepMultipleOrder: 'origin' | 'user-select' = 'user-select';
  @Input() customViewTemplate: TemplateRef<any>;
  /**
   * customViewTemplate?????????????????????????????????
   */
  @Input() customViewDirection: 'bottom' | 'right' | 'left' | 'top' = 'bottom';
  @Input() autoFocus = false;
  @Input() notAutoScroll = false; // ???????????????????????????????????????select??????
  @Input() loadingTemplateRef: TemplateRef<any>;
  @Input() @WithConfig() showAnimation = true;
  @ViewChild('selectWrapper', { static: true }) selectWrapper: ElementRef;
  @ViewChild('selectInput') selectInputElement: ElementRef;
  @ViewChild('selectMenu') selectMenuElement: ElementRef;
  @ViewChild('selectBox', { static: true }) selectBoxElement: ElementRef;
  @ViewChild('selectInputWithTemplate') selectInputWithTemplateElement: ElementRef;
  @ViewChild('selectInputWithLabel') selectInputWithLabelElement: ElementRef;
  @ViewChild('filterInput') filterInputElement: ElementRef;
  @ViewChild('dropdownUl') dropdownUl: ElementRef;
  @ViewChild(CdkConnectedOverlay) connectedOverlay: CdkConnectedOverlay;
  @ViewChild(CdkVirtualScrollViewport) virtualScrollViewport: CdkVirtualScrollViewport;
  virtualScrollViewportSizeMightChange = false;
  showLoading = false;
  _isOpen = false;
  menuPosition: VerticalConnectionPos = 'bottom';
  halfChecked = false;
  allChecked = false;
  isMouseEvent = false;
  dropDownWidth: number;
  startAnimation = false;

  filter = '';
  activeIndex = -1;

  // for multiple
  availableOptions = [];
  multiItems = [];

  popDirection: 'top' | 'bottom';

  selectIndex = -1;
  _inputValue: any;
  virtualScrollItemSize: any = {
    sm: 34,
    normal: 38,
    lg: 50
  };

  cdkConnectedOverlayOrigin: CdkOverlayOrigin;
  overlayPositions: Array<ConnectedPosition>;

  private sourceSubscription: BehaviorSubject<any>;
  private filterSubscription: Subscription;
  public value;
  private resetting = false;

  private onChange = (_: any) => null;
  private onTouch = () => null;
  constructor(
    private renderer: Renderer2,
    private windowRef: WindowRef,
    private changeDetectorRef: ChangeDetectorRef,
    private i18n: I18nService,
    private ngZone: NgZone,
    private devConfigService: DevConfigService,
  ) {
    this.valueParser = item => (typeof item === 'object' ? item[this.filterKey] || '' : (item + '') ? item.toString() : '');
    this.formatter = item => (typeof item === 'object' ? item[this.filterKey] || '' : (item + '') ? item.toString() : '');
  }

  ngOnInit(): void {
    if (!this.searchFn) {
      this.searchFn = (term: any) => {
        return of(
          (this.options ? this.options : [])
            .map((option, index) => ({ option: option, id: index }))
            .filter(
              item =>
                this.formatter(item.option)
                  .toLowerCase()
                  .indexOf(term.toLowerCase()) !== -1
            )
        );
      };
    }

    // ?????????????????????isSelectAll???true????????????
    if (!this.multiple) {
      this.isSelectAll = false;
    }
    this.setI18nText();
    this.registerFilterChange();
    this.setPositions();
  }

  ngAfterViewInit() {
    if (this.autoFocus && this.selectBoxElement) {
      setTimeout(() => {
        this.selectBoxElement.nativeElement.focus({
          preventScroll: this.notAutoScroll
        });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.sourceSubscription) {
      this.sourceSubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    if (this.i18nSubscription) {
      this.i18nSubscription.unsubscribe();
    }
    document.removeEventListener('click', this.onDocumentClick);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && (changes.searchFn || changes.options)) {
      this.resetSource();
      if (this.virtualScroll && this.virtualScrollViewport) {
        this.virtualScrollViewportSizeMightChange = true;
        this.virtualScrollViewport.checkViewportSize();
      }
    }
    if (changes['appendToBodyDirections']) {
      this.setPositions();
    }
  }
  setPositions() {
    if (this.appendToBodyDirections && this.appendToBodyDirections.length > 0) {
      this.overlayPositions = this.appendToBodyDirections.map(position => {
        if (typeof position === 'string') {
          return AppendToBodyDirectionsConfig[position];
        } else {
          return position;
        }
      }).filter(position => position !== undefined);
    } else {
      this.overlayPositions = undefined;
    }
  }

  setI18nText() {
    this.i18nCommonText = this.i18n.getI18nText().common;
    this.i18nSubscription = this.i18n.langChange().subscribe((data) => {
      this.i18nCommonText = data.common;
    });
  }

  getVirtualScrollHeight(len, size) {
    if (len > 0) {
      let height = this.templateItemSize ? this.templateItemSize * len : this.virtualScrollItemSize[size ? size : 'normal'] * len;
      if (this.isSelectAll && this.multiple) {
        height += this.virtualScrollItemSize[size ? size : 'normal'];
      }
      const scrollHight = parseInt(this.scrollHight, 10);
      if (height > scrollHight) {
        return this.scrollHight;
      } else {
        return height + 'px';
      }
    }
  }

  get realVirtualScrollItemSize() {
    return this.templateItemSize || this.virtualScrollItemSize[this.size || 'normal'];
  }

  resetSource() {
    if (this.sourceSubscription && this.searchFn) {
      this.resetting = true;
      this.sourceSubscription.next('');
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  registerFilterChange(): void {
    this.sourceSubscription = new BehaviorSubject<any>('');
    this.sourceSubscription.pipe(switchMap(term => this.searchFn(term))).subscribe(options => {
      this.availableOptions = options;
      this.setAvailableOptions();
      this.changeDetectorRef.markForCheck();
      if (this.appendToBody) {
        setTimeout(() => {
          if (this.connectedOverlay && this.connectedOverlay.overlayRef) {
            this.connectedOverlay.overlayRef.updatePosition();
          }
        });
      }
      // ???????????????????????????????????????????????????
      if (this.isSelectAll) {
        const selectedItemForFilterOptions = [];
        this.multiItems.forEach(item => {
          this.availableOptions.forEach(option => {
            if (item['id'] === option['id']) {
              selectedItemForFilterOptions.push(item);
            }
          });
        });
        this.setChecked(selectedItemForFilterOptions);
      }
      if (!this.multiple && (!this.value || this.availableOptions && !this.availableOptions.find(option => option.option === this.value))) {
        this.selectIndex = this.filter && this.availableOptions && this.availableOptions.length > 0 ? 0 : -1;
      }
    });

    this.sourceSubscription.subscribe(term => {
      if (this.resetting && term === '') {
        this.writeValue(this.value);
        this.resetting = false;
      }
    });

    this.searchInputValueChangeEvent();
  }

  searchInputValueChangeEvent() {
    if (this.isSearch && this.isOpen && this.filterInputElement) {
      this.filterInputElement.nativeElement.focus();
      if (!this.filterSubscription || this.appendToBody) { // ??????????????????
        this.filterSubscription = fromEvent(this.filterInputElement.nativeElement, 'input')
          .pipe(
            map((e: any) => e.target.value),
            filter(term => !this.disabled && this.searchFn && term.length >= 0),
            debounceTime(300) // hard code need refactory
          )
          .subscribe(term => {
            this.selectIndex = -1;
            return this.sourceSubscription.next(term);
          });
      }
    }
  }

  writeValue(obj: any): void {
    let objValue = obj;
    if (obj === null || obj === undefined) {
      if (this.multiple) {
        objValue = [];
      } else {
        objValue = '';
      }
    }
    this.value = objValue;

    if (this.multiple) {
      this.value = this.value ? this.value : [];
      this.value = Array.isArray(this.value) ? this.value : [this.value];
      this.multiItems = this.value.map((option, index) => ({ option: option, id: this.options.indexOf(option) }));
    } else {
      const selectedItem = this.availableOptions.find(
        item => this.formatter(item.option) === this.formatter(this.value)
      );
      this.activeIndex = selectedItem ? selectedItem.id : -1;
      this.selectIndex = this.activeIndex ? this.activeIndex : -1;
    }

    this.writeIntoInput(this.value);
    this.changeDetectorRef.markForCheck();
    this.setChecked(this.value);
  }

  writeIntoInput(value): void {
    this._inputValue = this.multiple
      ? (value || []).map(option => this.valueParser(option)).join(', ')
      : this.valueParser(value);
    this.setAvailableOptions();
  }

  setAvailableOptions() {
    if (!this.value || !Array.isArray(this.availableOptions)) {
      return;
    }
    let _value = this.value;
    if (!this.multiple) {
      _value = [_value];
    }
    this.availableOptions = this.availableOptions
      .map((item) => ({
        isChecked: _value.findIndex(i => JSON.stringify(i) === JSON.stringify(item.option)) > -1, id: item.id, option: item.option
      }));
  }

  choose = (option, index, $event?: Event) => {
    if ($event) {
      $event.preventDefault();
      $event.stopPropagation();
    }

    if (typeof option === 'object') {
      if (Object.keys(option).length === 0 || this.disabled) {
        this.isOpen = false;
        return;
      }
    } else {
      if (this.disabled) {
        this.isOpen = false;
        return;
      }
    }

    if (this.optionDisabledKey && option[this.optionDisabledKey]) {
      return;
    }
    if (this.optionImmutableKey && option[this.optionImmutableKey]) {
      return;
    }

    if (this.multiple) {
      const indexOfOption = this.multiItems.findIndex(item => JSON.stringify(item.option) === JSON.stringify(option));
      if (indexOfOption === -1) {
        this.multiItems.push({ id: index, option });
      } else {
        this.multiItems.splice(indexOfOption, 1);
      }
      if (this.keepMultipleOrder === 'origin') {
        this.multiItems.sort((a, b) => a.id - b.id);
      }
      this.value = this.multiItems.map(item => item.option);
    } else {
      this.value = option;
      this.activeIndex = index;
      this.selectIndex = index;
      this.toggle();
    }
    this.writeIntoInput(this.value);
    this.onChange(this.value);
    this.valueChange.emit(option);
    this.setChecked(this.value);
  }

  updateCdkConnectedOverlayOrigin() {
    if (this.selectWrapper.nativeElement) {
      this.cdkConnectedOverlayOrigin = new CdkOverlayOrigin(
        formWithDropDown(this.selectWrapper) || this.selectWrapper.nativeElement
      );
    }
  }

  autoToggle($event) {
    $event.preventDefault();
    $event.stopPropagation();
    if (this.toggleOnFocus && !this.disabled && !this.isOpen && !this.isMouseEvent) {
      this.toggle();
    }
  }

  // mousedown mouseup??????focus???click????????????
  @HostListener('mousedown', ['$event'])
  public setMouseEventTrue(event) {
    this.isMouseEvent = true;
  }
  @HostListener('mouseup', ['$event'])
  public setMouseEventFalse(event) {
    this.isMouseEvent = false;
  }

  toggle() {
    if (this.disabled) {
      this.isOpen = false;
      return;
    }

    if (!this.isOpen) {
      this.filter = '';
      this.resetSource();
      if (!this.appendToBody) {
        let direction = '';
        switch (this.direction) {
          case 'auto':
            direction = this.isBottomRectEnough() ? 'bottom' : 'top';
            break;
          case 'down':
            direction = 'bottom';
            break;
          case 'up':
            direction = 'top';
            break;
          default:
            direction = 'bottom';
        }
        this.popDirection = <any>direction;
      } else {
        this.updateCdkConnectedOverlayOrigin();
      }
    } else if (!this.showAnimation) {
      this.startAnimation = false;
    }
    this.isOpen = !this.isOpen;
    if (this.virtualScrollViewportSizeMightChange) { // ????????????????????????options?????????????????????????????????????????????
      setTimeout(() => {
        if (this.virtualScrollViewportSizeMightChange && this.virtualScrollViewport) {
          this.virtualScrollViewportSizeMightChange = false;
          this.virtualScrollViewport.checkViewportSize();
        }
      }, 0);
    }
    if (this.isSearch && this.isOpen) { // ??????????????????setTimeout
      setTimeout(() => {
        this.searchInputValueChangeEvent();
      }, 100);
    }
  }

  isBottomRectEnough() {
    const selectMenuElement = this.selectMenuElement.nativeElement;
    const selectInputElement = this.selectInputElement || this.selectInputWithLabelElement || this.selectInputWithTemplateElement;
    const displayStyle =
      selectMenuElement.style['display'] || (<any>window).getComputedStyle(selectMenuElement).display;
    let tempStyle;
    if (displayStyle === 'none') { // ????????? ????????????????????????????????? ??????animationEnd???????????????none???????????????
      tempStyle = {
        visibility: selectMenuElement.style.visibility,
        display: selectMenuElement.style.display,
        transform: selectMenuElement.style.transform,
      };
      this.renderer.setStyle(selectMenuElement, 'visibility', 'hidden');
      this.renderer.setStyle(selectMenuElement, 'display', 'block');
      this.renderer.setStyle(selectMenuElement, 'transform', 'translate(0, -9999)');
    }
    const elementHeight = selectMenuElement.offsetHeight;
    const bottomDistance =
      this.windowRef.innerHeight - selectInputElement.nativeElement.getBoundingClientRect().bottom;
    const isBottomEnough = bottomDistance >= elementHeight;
    if (displayStyle === 'none') {
      this.renderer.setStyle(selectMenuElement, 'visibility', tempStyle.visibility);
      this.renderer.setStyle(selectMenuElement, 'display', tempStyle.display);
      this.renderer.setStyle(selectMenuElement, 'transform', tempStyle.transform);
    }
    return isBottomEnough;
  }

  setDocumentClickListener() {
    this.ngZone.runOutsideAngular(() => {
      if (this.isOpen) {
        document.addEventListener('click', this.onDocumentClick);
      } else {
        document.removeEventListener('click', this.onDocumentClick);
      }
    });
  }

  onDocumentClick = ($event: Event) => {
    if (this.isOpen && !this.selectBoxElement.nativeElement.contains($event.target)) {
      this.isOpen = false;
      this.selectIndex = this.activeIndex ? this.activeIndex : -1;
      this.changeDetectorRef.detectChanges();
    }
  }

  onEscKeyup($event) {
    if (this.isOpen) {
      $event.stopPropagation();
    }
    this.isOpen = false;
  }

  handleKeyUpEvent($event) {
    if (this.isOpen) {
      $event.preventDefault();
      $event.stopPropagation();
      this.selectIndex = this.selectIndex === 0 || this.selectIndex === -1 ? this.availableOptions.length - 1 : this.selectIndex - 1;
      this.scrollToActive();
    }
  }

  handleKeyDownEvent($event) {
    if (this.isOpen) {
      $event.preventDefault();
      $event.stopPropagation();
      this.selectIndex =
        this.selectIndex === this.availableOptions.length - 1 ? 0 : this.selectIndex + 1;
      this.scrollToActive();
    }
  }

  scrollToActive(): void {
    const that = this;
    setTimeout(_ => {
      try {
        const selectIndex = that.selectIndex + (that.isSelectAll ? 1 : 0); // ?????????????????????????????????index?????????1
        const scrollPane: any = that.dropdownUl.nativeElement.children[selectIndex];
        if (scrollPane.scrollIntoViewIfNeeded) {
          scrollPane.scrollIntoViewIfNeeded(false);
        } else {
          const containerInfo = that.dropdownUl.nativeElement.getBoundingClientRect();
          const elementInfo = scrollPane.getBoundingClientRect();
          if (elementInfo.bottom > containerInfo.bottom || elementInfo.top < containerInfo.top) {
            scrollPane.scrollIntoView(false);
          }
        }
      } catch (e) {
      }
    });
  }

  handleKeyEnterEvent($event) {
    if (this.isOpen) {
      $event.preventDefault();
      $event.stopPropagation();
      const item = this.availableOptions[this.selectIndex];
      if (item) {
        this.choose(item.option, item.id, $event);
      } else {
        this.toggle();
      }
    } else {
      this.toggle();
    }
  }

  removeItem(item, $event) {
    this.choose(item.option, item.id, $event);
  }

  selectAll() {
    const mutableOption = this.optionImmutableKey
      ? this.availableOptions.filter(item => !item.option[this.optionImmutableKey])
      : this.availableOptions;
    const selectedImmutableOption = this.optionImmutableKey
      ? this.multiItems.filter(item => item.option[this.optionImmutableKey])
      : [];

    if (mutableOption && mutableOption.length > (this.multiItems.length - selectedImmutableOption.length)) {
      mutableOption.forEach(item => {
        const indexOfOption = this.multiItems
          .findIndex(i => JSON.stringify(i.option) === JSON.stringify(item.option));
        if (indexOfOption === -1) {
          this.multiItems.push({ id: item.id, option: item.option });
        }
      });
    } else {
      this.multiItems = [...selectedImmutableOption];
    }
    this.value = this.multiItems.map(item => item.option);
    this.writeIntoInput(this.value);
    this.onChange(this.value);
    this.valueChange.emit(this.multiItems);
    this.setChecked(this.value);
  }

  trackByFn(index, item) {
    return index;
  }

  trackByOptionPointer(index, item) {
    return item.option;
  }

  loadMoreEvent(event) {
    this.showLoading = true;
    this.loadMore.emit({ instance: this, event: event });
  }

  loadFinish() {
    this.showLoading = false;
    this.changeDetectorRef.markForCheck();
  }

  loadStart() {
    this.showLoading = true;
    this.changeDetectorRef.markForCheck();
  }

  onPositionChange(position: ConnectedOverlayPositionChange) {
    this.menuPosition = position.connectionPair.originY;
  }

  animationEnd($event) {
    if (!this.isOpen && this.selectMenuElement && this.showAnimation) {
      const targetElement = this.selectMenuElement.nativeElement;
      this.startAnimation = false;
      setTimeout(() => {
        // ?????????????????????display??????block??? ???????????????????????????
        this.renderer.setStyle(targetElement, 'display', 'none');
      });
    }
  }

  setChecked(selectedItem) {
    if (!selectedItem) {
      return;
    }
    if (!this.isSelectAll) {
      return;
    }
    this.halfChecked = false;
    if (selectedItem.length === this.availableOptions.length) {
      this.allChecked = true;
    } else if (selectedItem.length === 0) {
      this.allChecked = false;
    } else {
      this.halfChecked = true;
    }
  }

  showSelectAll() {
    return this.isSelectAll && this.multiple && this.availableOptions.length > 0;
  }

  public forceSearchNext() {
    this.sourceSubscription.next(this.filter);
  }

  valueClear($event) {
    $event.stopPropagation();
    this.value = null;
    this.resetStatus();
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  resetStatus() {
    this.writeIntoInput('');
    if (this.availableOptions && this.availableOptions[this.activeIndex]) {
      this.availableOptions[this.activeIndex].isChecked = false;
    }
    this.activeIndex = -1;
    this.selectIndex = -1;
    this.changeDetectorRef.markForCheck();
  }

  clearText() {
    this.filter = '';
    this.forceSearchNext();
  }
}
