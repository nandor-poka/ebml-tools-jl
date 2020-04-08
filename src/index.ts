import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

//import { requestAPI } from './embl-tools-jl';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILauncher } from '@jupyterlab/launcher';

import emb_logo from '../style/EMBL_logo.svg';

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
  activate: (
    app: JupyterFrontEnd,
    launcher: ILauncher
    ) => {
      const { commands } = app;
      const clustalo = CommandIDs.clustalo;
      const icon = new LabIcon({
        name: 'launcher:clustalo',
        svgstr: emb_logo
      });
      console.log('JupyterLab extension embl-tools-jl is activated!');

      commands.addCommand(clustalo, {
        label: 'ClustalO',
        caption: 'ClustalO webservice',
        icon: icon,
        execute: async => {
          return commands.execute('docmanager:open', {
            path: 'EMBL-Tools/clustalo.ipynb',
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
};

export default extension;
