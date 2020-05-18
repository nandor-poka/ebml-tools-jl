import { ReactWidget } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import React from 'react';
import CSS from 'csstype';

const margin: CSS.Properties = {
  margin: '1em'
};
/**
 * React component for settings.
 *
 * @returns The React component
 * @param props Properties object that is typecasted to ISettingRegistry.ISettings
 */
const SettingsComponent = (props: any): JSX.Element => {
  const settings: ISettingRegistry.ISettings = props.settings;
  return (
    <div>
      <h1 style={margin}>EMBL-Tools Settngs</h1>
      <h3 style={margin} id="currentEmail">
        Current email is: {settings.get('email').composite as string}
      </h3>
      <h3 style={margin} id="currentOutdir">
        Current output directtory is:{' '}
        {settings.get('outdir').composite as string}
      </h3>
      <h2 style={margin}>Change Settings</h2>
      <p style={margin}>
        Set default email: <input type="text" id="email" name="email" />
      </p>
      <p style={margin}>
        Set default output directory:
        <input type="text" id="outdir" name="outdir" />
      </p>
      <br />
      <br />
      <button
        style={margin}
        onClick={async (): Promise<void> => {
          if (
            (document.getElementById('email') as HTMLInputElement).value ===
              '' ||
            (document.getElementById('outdir') as HTMLInputElement).value === ''
          ) {
            document.getElementById('warningText').innerHTML =
              'Email and output directory cannot be empty.';
            return;
          }
          if (
            !(document.getElementById('email') as HTMLInputElement).value.match(
              '.*@.*..*'
            )
          ) {
            document.getElementById('warningText').innerHTML =
              'Email does not seem to be valid. Please use the following format: username@provider.tld: eg.: someone@example.com';
            return;
          }
          await settings
            .set(
              'email',
              (document.getElementById('email') as HTMLInputElement).value
            )
            .catch(reason => {
              console.error(
                `Something went wrong when setting email.\n${reason}`
              );
            });
          let outdirClean = (document.getElementById(
            'outdir'
          ) as HTMLInputElement).value;
          if (outdirClean.endsWith('/')) {
            outdirClean = outdirClean.substr(0, outdirClean.length - 1);
          }
          await settings.set('outdir', outdirClean).catch(reason => {
            console.error(
              `Something went wrong when setting outdir.\n${reason}`
            );
          });
          document.getElementById(
            'currentEmail'
          ).innerHTML = ('Current email is: ' +
            settings.get('email').composite) as string;
          document.getElementById(
            'currentOutdir'
          ).innerHTML = ('Current output directtory is: ' +
            settings.get('outdir').composite) as string;
          document.getElementById('warningText').innerHTML = 'Settings saved.';
        }}
      >
        Save settings
      </button>
      <br />
      <h2 id="warningText" style={{ color: 'red', margin: '1em' }} />
    </div>
  );
};

/**
 * The Lumio widget that wraps the settings ui React widget.
 */
export class SettingsWidget extends ReactWidget {
  settings: ISettingRegistry.ISettings;
  /**
   * Constructs a new SettingsWidget.
   *
   * @param settings ISettingRegistry.ISettings object coming from the main extension when widget is created.
   */
  constructor(settings: ISettingRegistry.ISettings) {
    super();
    this.addClass('jp-ReactWidget');
    this.settings = settings;
  }

  render(): JSX.Element {
    return <SettingsComponent settings={this.settings} />;
  }
}
