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
import { MainAreaWidget, ICommandPalette } from '@jupyterlab/apputils';

import embLogo from '../style/EMBL_logo.svg';
import { SettingsWidget } from './settings_widget';

const FACTORY = 'Notebook';
const CATEGORY = 'EMBL Tools - 0.2.3';
const PLUGIN_ID = 'embl-tools-jl:launcher-icons';
const TOOL_CATEGORY_MSA = 'Multiple Sequence Alignment (MSA)';
const TOOL_CATEGORY_PSA = 'Pairwise Sequence Alignment (PSA)';
const TOOL_CATEGORY_PHY = 'Phylogeny';
const TOOL_CATEGORY_PFA = 'Protein Functional Analysis (PFA)';
const TOOL_CATEGORY_RNA = 'RNA Analysis';
const TOOL_CATEGORY_SFC = 'Sequence Format Conversion (SFC)';
const TOOL_CATEGORY_SO = 'Sequence Operations (SO)';
const TOOL_CATEGORY_ST = 'Sequence Translation (ST)';
const TOOL_CATEGORY_SSS = 'Sequence Similarity Search (SSS)';
const TOOL_CATEGORY_STA = 'Sequence Statistics (seqstats)';
const TOOL_CATEGORY_OTH = 'Other';

/**
 * Initialization data for the embl-tools-jl extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [ILauncher, ISettingRegistry, IMainMenu, ICommandPalette],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    settingsRegistry: ISettingRegistry,
    mainMenu: IMainMenu,
    commandPalette: ICommandPalette
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

    // Create submenus for the tool's own menu for tools.
    const toolsSubMenuMSA = new Menu({ commands });
    const toolsSubMenuPSA = new Menu({ commands });
    const toolsSubMenuPHY = new Menu({ commands });
    const toolsSubMenuPFA = new Menu({ commands });
    const toolsSubMenuRNA = new Menu({ commands });
    const toolsSubMenuSFC = new Menu({ commands });
    const toolsSubMenuSO = new Menu({ commands });
    const toolsSubMenuST = new Menu({ commands });
    const toolsSubMenuSSS = new Menu({ commands });
    const toolsSubMenuSTA = new Menu({ commands });
    const toolsSubMenuOTH = new Menu({ commands });
    toolsSubMenuMSA.title.label = TOOL_CATEGORY_MSA;
    toolsSubMenuPSA.title.label = TOOL_CATEGORY_PSA;
    toolsSubMenuPHY.title.label = TOOL_CATEGORY_PHY;
    toolsSubMenuPFA.title.label = TOOL_CATEGORY_PFA;
    toolsSubMenuRNA.title.label = TOOL_CATEGORY_RNA;
    toolsSubMenuSFC.title.label = TOOL_CATEGORY_SFC;
    toolsSubMenuSO.title.label = TOOL_CATEGORY_SO;
    toolsSubMenuST.title.label = TOOL_CATEGORY_ST;
    toolsSubMenuSSS.title.label = TOOL_CATEGORY_SSS;
    toolsSubMenuSTA.title.label = TOOL_CATEGORY_STA;
    toolsSubMenuOTH.title.label = TOOL_CATEGORY_OTH;

    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuMSA });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuPSA });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuPHY });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuPFA });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuRNA });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuSFC });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuSO });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuST });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuSSS });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuSTA });
    toolsMainMenu.addItem({ type: 'submenu', submenu: toolsSubMenuOTH });

    /**
     * Load the settings for this extension
     *
     * @param settings Extension settings
     */
    function loadSetting(settings: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      const email = settings.get('email').composite as string;
      const outdir = settings.get('outdir').composite as string;

      console.log(`Settings are  set to '${email}' and flag to '${outdir}'`);
      requestAPI<any>('settings', {
        body: JSON.stringify({
          path: emblToolsPath,
          email: email,
          outdir: outdir
        }),
        method: 'POST'
      }).then((result: any) => {
        if (result.result === false) {
          window.alert(
            'Failed to save EMBL-Tools settings to file. Reason: ' +
              result.reason
          );
        }
      });
    }

    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    Promise.all([app.restored, settingsRegistry.load(PLUGIN_ID)])
      .then(([, settings]) => {
        // Read the settings
        loadSetting(settings);

        // Listen for your plugin setting changes using Signal
        settings.changed.connect(loadSetting);
        commands.addCommand(commandPrefix + 'emailSettings', {
          label: 'Open settings',
          execute: () => {
            const content = new SettingsWidget(settings);
            const widget = new MainAreaWidget<SettingsWidget>({ content });
            widget.title.label = 'EMBL-Tools settings';
            app.shell.add(widget, 'main');
          }
        });
        toolsMainMenu.addItem({ command: commandPrefix + 'emailSettings' });
      })
      .catch(reason => {
        window.alert(
          `Failed to read EMBL-Tools settings from file.\n${reason}`
        );
        console.error(
          `Failed to read EMBL-Tools settings from file.\n${reason}`
        );
      });
    // GET request
    try {
      const data = await requestAPI<any>('startup');
      foundExtension = data.found;
      if (foundExtension) {
        emblToolsPath = PathExt.normalize(data.path);
      } else {
        window.alert(
          'EMBL-Tools not accesible from the root of current JupyterLab instance, thus EMBL-Tools will be disabled.\n' +
            'Please run JupyterLab from a directory from which EMBL-Tools is accesible and is named "embl-tools".'
        );
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
      let ToolDescriptions;

      try {
        const data = await requestAPI<any>('descriptions');
        if (data.success) {
          ToolDescriptions = JSON.parse(data.descriptions);
        } else {
          console.log(data.error_msg);
        }
      } catch (reason) {
        console.error(`Error on GET embl-tools-jl/descriptions.\n${reason}`);
      }

      let categoryMenu: Menu;
      for (const index in tools) {
        const rank = 1;
        const toolname = tools[index].split('ipynb')[0].replace('.', '');
        if (
          ToolDescriptions !== undefined &&
          ToolDescriptions[toolname] !== undefined
        ) {
          switch (ToolDescriptions[toolname].category) {
            case TOOL_CATEGORY_MSA:
              categoryMenu = toolsSubMenuMSA;
              break;
            case TOOL_CATEGORY_OTH:
              categoryMenu = toolsSubMenuOTH;
              break;
            case TOOL_CATEGORY_PFA:
              categoryMenu = toolsSubMenuPFA;
              break;
            case TOOL_CATEGORY_PHY:
              categoryMenu = toolsSubMenuPHY;
              break;
            case TOOL_CATEGORY_PSA:
              categoryMenu = toolsSubMenuPSA;
              break;
            case TOOL_CATEGORY_RNA:
              categoryMenu = toolsSubMenuRNA;
              break;
            case TOOL_CATEGORY_SFC:
              categoryMenu = toolsSubMenuSFC;
              break;
            case TOOL_CATEGORY_SO:
              categoryMenu = toolsSubMenuSO;
              break;
            case TOOL_CATEGORY_SSS:
              categoryMenu = toolsSubMenuSSS;
              break;
            case TOOL_CATEGORY_ST:
              categoryMenu = toolsSubMenuST;
              break;
            case TOOL_CATEGORY_STA:
              categoryMenu = toolsSubMenuSTA;
              break;
            default:
              categoryMenu = toolsSubMenuOTH;
              break;
          }
        } else {
          categoryMenu = toolsSubMenuOTH;
        }

        commands.addCommand(
          commandPrefix + tools[index].toLowerCase().split('.')[0],
          {
            label:
              ToolDescriptions === undefined
                ? toolname
                : ToolDescriptions[toolname] === undefined
                ? toolname
                : ToolDescriptions[toolname].label,
            caption:
              ToolDescriptions === undefined
                ? toolname + ' webservice'
                : ToolDescriptions[toolname] === undefined
                ? toolname + ' webservice'
                : ToolDescriptions[toolname].caption,
            icon: icon,
            execute: async => {
              return commands.execute('docmanager:open', {
                path: emblToolsPath + '/notebooks/' + tools[index],
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
        // Add the current tool to the EMBL-Tools menu, in the appropriate category
        categoryMenu.addItem({
          command: commandPrefix + tools[index].toLowerCase().split('.')[0]
        });
        // Add the current tool / command to the command plaette
        commandPalette.addItem({
          command: commandPrefix + tools[index].toLowerCase().split('.')[0],
          category: CATEGORY
        });
      }
    }
  }
};

export default extension;
