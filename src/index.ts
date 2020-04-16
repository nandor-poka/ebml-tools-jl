import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './embl-tools-jl';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILauncher } from '@jupyterlab/launcher';
import { PathExt } from '@jupyterlab/coreutils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu } from '@lumino/widgets';

import embLogo from '../style/EMBL_logo.svg';

const FACTORY = 'Notebook';
const CATEGORY = 'EMBL Tools';
const PLUGIN_ID = 'embl-tools-jl:launcher-icons';

const toolNameMapping = new Map<string, string>();
toolNameMapping.set('clustalo.ipynb', 'ClustalO');
toolNameMapping.set('ncbiBlast.ipynb', 'NCBI BLAST');


/**
 * Initialization data for the embl-tools-jl extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [ILauncher, ISettingRegistry, IMainMenu],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    settings: ISettingRegistry,
    mainMenu: IMainMenu
  ) => {
    const { commands } = app;
    const commandPrefix = 'embl-tools-jl:';
    const icon = new LabIcon({
      name: 'launcher:embl-icon',
      svgstr: embLogo
    });
    let foundExtension = false;
    let emblToolsPath = '';
    console.log('JupyterLab extension embl-tools-jl is activated!');
    // Create a menu in the main menu bar
    const toolsMainMenu = new Menu({ commands });
    toolsMainMenu.title.label = 'EMBL-Tools';
    mainMenu.addMenu(toolsMainMenu, { rank: 80 });
    // Create submenu for the tool's own menu for tools.
    const toolsSubMenu = new Menu({ commands });
    toolsSubMenu.title.label = 'Tools';
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenu });

    const settingsSubMenu = new Menu({ commands });
    settingsSubMenu.title.label = 'Settings';
    toolsMainMenu.addItem({ type: 'submenu', submenu: settingsSubMenu });
    /**
     * Load the settings for this extension
     *
     * @param setting Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      const email = setting.get('email').composite as string;
      const outdir = setting.get('outdir').composite as string;

      console.log(`Settings are  set to '${email}' and flag to '${outdir}'`);
      commands.addCommand(commandPrefix+'emailSettings',{
        label:'Set default email',
        execute:() =>{
          window.alert('email settings.')
        }
      });
      settingsSubMenu.addItem({command:commandPrefix+'emailSettings'});
    }

    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    Promise.all([app.restored, settings.load(PLUGIN_ID)])
      .then(([, setting]) => {
        // Read the settings
        loadSetting(setting);

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);

      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });
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

        // Add the current tool to the launcher
        launcher.add({
          command: commandPrefix + tools[index].toLowerCase().split('.')[0],
          category: CATEGORY,
          rank: rank
        });
        toolsSubMenu.addItem({
          command: commandPrefix + tools[index].toLowerCase().split('.')[0]
        });

        ++rank;
      }
    }
  }
};

export default extension;
