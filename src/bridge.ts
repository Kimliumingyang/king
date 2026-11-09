import type {PlatformSavePort} from './game-save';
export interface PlatformBridge extends PlatformSavePort {init():Promise<void>;gameplayStart():void;gameplayStop():void;}
export class MockBridge implements PlatformBridge {
  private snapshot:string|null=null;
  async init(){} gameplayStart(){} gameplayStop(){}
  async loadSave(){return this.snapshot;}
  async save(value:string){this.snapshot=value;}
}
