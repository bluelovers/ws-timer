/**
 * Created by user on 2017/8/5/005.
 */
import * as coreDecorators from 'core-decorators';
import { autobind, readonly, nonconfigurable } from 'core-decorators';
export { autobind, readonly, nonconfigurable, coreDecorators, };
/**
 * configurable：是否可刪除特性或修改特性的 writable、configurable 與 enumerable 屬性。
 */
export declare function configurable(target: any, key: any, descriptor: any): any;
/**
 * writable：是否可修改特性值。
 */
export declare function writable(target: any, key: any, descriptor: any): any;
/**
 * enumerable：是否可使用 for (var prop in obj) 迭代。
 */
export declare function nonenumerable(target: any, key: any, descriptor: any): any;
/**
 * enumerable：是否可使用 for (var prop in obj) 迭代。
 */
export declare function enumerable(target: any, key: any, descriptor: any): any;
export declare function decorate(target: any, key: any, attr: any, descriptor: any): any;
