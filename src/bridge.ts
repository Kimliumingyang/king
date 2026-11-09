export interface PlatformBridge { init():Promise<void>; gameplayStart():void; gameplayStop():void; }
export class MockBridge implements PlatformBridge {
  async init() {} gameplayStart() {} gameplayStop() {}
}
