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

const toolNameMapping = new Map<string, string>();
toolNameMapping.set('clustalo.ipynb', 'ClustalO');
toolNameMapping.set('ncbiBlast.ipynb', 'NCBI BLAST');

/**
 * Initialization data for the embl-tools-jl extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'embl-tools-jl',
  autoStart: true,
  requires: [ILauncher],
  activate: async (app: JupyterFrontEnd, launcher: ILauncher) => {
    const { commands } = app;
    const commandPrefix = 'embl-tools-jl:';
    const icon = new LabIcon({
      name: 'launcher:clustalo',
      svgstr: embLogo
    });
    let foundExtension = false;
    let emblToolsPath = '';
    console.log('JupyterLab extension embl-tools-jl is activated!');
    // GET request
    try {
      const data = await requestAPI<any>('startup');
      foundExtension = data.found;
      if (foundExtension) {
        emblToolsPath = PathExt.normalize(data.path);
      }
    } catch (reason) {
      console.error(`Error on GET embl-tools-jl/startup.\n${reason}`);
    }

    if (foundExtension) {
      let tools: string[] = [];
      try {
        const data = await requestAPI<any>('toolcheck', {
          body: JSON.stringify({ path: emblToolsPath }),
          method: 'POST'
        });
        tools = data.tools;
      } catch (reason) {
        console.error(`Error on GET embl-tools-jl/toolcheck.\n${reason}`);
      }

      for (const index in tools) {
        let rank = 1;
        commands.addCommand(
          commandPrefix + tools[index].toLowerCase().split('.')[0],
          {
            label:
              toolNameMapping.get(tools[index]) === undefined
                ? tools[index].toLowerCase().split('.')[0]
                : toolNameMapping.get(tools[index]),
            caption:
              toolNameMapping.get(tools[index]) === undefined
                ? tools[index].toLowerCase().split('.')[0] + ' webservice'
                : toolNameMapping.get(tools[index]) + ' webservice',
            icon: icon,
            execute: async => {
              return commands.execute('docmanager:open', {
                path: emblToolsPath + '/' + tools[index],
                factory: FACTORY
              });
            }
          }
        );
        // Add the clustalo to the launcher
        if (launcher) {
          launcher.add({
            command: commandPrefix + tools[index].toLowerCase().split('.')[0],
            category: CATEGORY,
            rank: rank
          });
        }
        ++rank;
      }
    }
  }
};

export default extension;
