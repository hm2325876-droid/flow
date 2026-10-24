import {contextBridge,ipcRenderer} from 'electron';
import {channels,targetSchema,slotSchema,desktopStateSchema,type DesktopAPI} from '@flowproof/contracts';
const api:DesktopAPI=Object.freeze({
  state:async()=>desktopStateSchema.parse(await ipcRenderer.invoke(channels.state)),
  connect:async value=>desktopStateSchema.parse(await ipcRenderer.invoke(channels.connect,targetSchema.parse(value))),
  validation:async()=>desktopStateSchema.parse(await ipcRenderer.invoke(channels.validation)),
  check:async()=>desktopStateSchema.parse(await ipcRenderer.invoke(channels.check)),
  disconnect:async()=>desktopStateSchema.parse(await ipcRenderer.invoke(channels.disconnect)),
  slot:async value=>{await ipcRenderer.invoke(channels.slot,slotSchema.parse(value))},
  onState:listener=>{const changed=(_event:Electron.IpcRendererEvent,value:unknown)=>{const result=desktopStateSchema.safeParse(value);if(result.success)listener(result.data)};ipcRenderer.on(channels.changed,changed);return()=>ipcRenderer.removeListener(channels.changed,changed);}
} satisfies DesktopAPI);
contextBridge.exposeInMainWorld('flowproof',api);
