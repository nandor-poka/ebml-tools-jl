import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './embl-tools-jl';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILauncher } from '@jupyterlab/launcher';
import { PathExt } from '@jupyterlab/coreutils';

import embLogo from '../style/EMBL_logo.svg';

const FACTORY = 'Notebook';
const CATEGORY = 'EMBL Tools';

namespace CommandIDs {
  export const clustalo = 'emlb-tools-jl:clustalo';
}
/**
 * Initialization data for the embl-tools-jl extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'embl-tools-jl',
  autoStart: true,
  requires: [ILauncher],
  activate: async ( app: JupyterFrontEnd, launcher: ILauncher ) => {
    const { commands } = app;
    const clustalo = CommandIDs.clustalo;
    const icon = new LabIcon({
      name: 'launcher:clustalo',
      svgstr: embLogo
    });
    let found_extension = false;
    let embl_tools_path = '';
    console.log('JupyterLab extension embl-tools-jl is activated!');
    // GET request
    try {
      const data = await requestAPI<any>('findtools');
      console.log(data);
      found_extension = data.found;
      if (found_extension){
        embl_tools_path = PathExt.normalize(data.path);
      }
      console.log(embl_tools_path)
    } catch (reason) {
      console.error(`Error on GET embl-tools-jl/findtools.\n${reason}`);
    }
      
    if (found_extension){
      commands.addCommand(clustalo, {
        label: 'ClustalO',
        caption: 'ClustalO webservice',
        icon: icon,
        execute: async => {
          return commands.execute('docmanager:open', {
            path: embl_tools_path+'/clustalo.ipynb',
            factory: FACTORY
          });
        }
      });  
      
      // Add the clustalo to the launcher
      if (launcher) {
        launcher.add({
          command: clustalo,
          category: CATEGORY,
          rank: 1
        });
      } 
    }
  }  
};

export default extension;
