import json

from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join
import tornado
import os
import logging
import subprocess
_location = os.path.realpath(os.path.join(os.getcwd(), os.path.dirname(__file__)))
_embl_tools_location = os.path.join(_location,'../embl_tools/')
_private_dir = os.path.join(os.environ['HOME'],'private/.embl_tools')
_log_file_path = os.path.join(_private_dir, 'embl-tools-jl.log')
_settings_file_location = os.path.join(_private_dir, 'settings.json')
_settings = None
try:
    if not os.path.exists(_private_dir):
        os.makedirs(_private_dir)
except Exception as ex:
    print("Failed to create directory for private data.")
    
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
logFileHandler = logging.FileHandler(_log_file_path, mode='a', encoding='utf-8', delay=False)
logFileHandler.setFormatter(formatter)
logger.addHandler(logFileHandler)
logger.propagate=False

# /startup endpoint
class Startup_handler(APIHandler):
    
    @property
    def contents_manager(self):
        '''Currently configured notebook server ContentsManager.'''
        return self.settings['contents_manager']

    @property
    def root_dir(self):
        '''Root directory to scan.'''
        return self.contents_manager.root_dir

    def scan_disk(self, path):
        try:
            for entry in os.scandir(path):
                if entry.is_dir():
                    if entry.name.lower() == 'embl-tools-jl':
                        continue
                    if entry.name.lower() == 'embl-tools' or entry.name.lower() == 'embl_tools':
                        return os.path.relpath(os.path.dirname(entry.path), self.root_dir)+'/'+entry.name 
                    subdir_scan=self.scan_disk(entry.path)
                    if subdir_scan:
                        return subdir_scan
            return None
        except PermissionError:
            logger.warning('Permission denied: '+ path)
        except OSError as error:
            logger.error('OSError code: %i at %s ', error.errno, path)

    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        embl_path = self.scan_disk(self.root_dir)
        old_location = None
        if embl_path == None:
            logger.info(f'EMBL-Tools not found in current Jupyter Lab root dir: {self.root_dir}. Copying built in version as temporary solution.')
            real_embl_path = os.path.join(self.root_dir,"embl_tools")
            embl_path = os.path.relpath('embl_tools', self.root_dir)
            logger.info(f'Executing: cp -R {_embl_tools_location} {real_embl_path})')
            try:
                subprocess.run(['cp', '-R', f'{_embl_tools_location}', f'{real_embl_path}'])
                logger.info('Copying done.')
            except Exception as ex:
                logger.error(f'Failed to copy EMBL-tools to current Jupyer Lab location\n{ex}')
            logger.info("Setting PYTHONPATH environmental variable.")
            os.environ['PYTHONPATH']=f'{os.path.abspath(embl_path)}{os.pathsep}$PYTHONPATH'
            
            if not os.path.exists(_settings_file_location):
                if not os.path.exists(_private_dir):
                    logger.info(f'Creating parent directory for settings file: {_settings_file_dir_}')                   
                    try:
                        os.makedirs(_private_dir)
                        logger.info(f'{_settings_file_dir_} created.') 
                    except Exception as ex:
                        logger.error(f'Failed to create parent directory for settings file at: {_settings_file_dir_}\n{ex}')
                try:
                    logger.info(f'Settings file not found at: {_settings_file_location}\nCreating empty settings file.')
                    with open(_settings_file_location, mode='w') as settingsFile:
                            settingsFile.write(json.dumps({}))
                            settingsFile.close()
                except Exception as ex:
                    logger.error(f'Failed create empty settings file.\n{ex}')
            else:
                logger.info(f'Settings found at: {_settings_file_location}')
            try:
                with open(_settings_file_location, mode='r') as settingsFile:
                    settingsData = settingsFile.read()
                    _settings = json.loads(settingsData)
                    settingsFile.close()
            except Exception as ex:
                logger.error(f'Failed to read settings file at startup.\n{ex}')
            old_location = None if 'tmploc' not in _settings else _settings['tmploc']
            _settings['tmploc'] = real_embl_path

            try:
                with open(_settings_file_location, mode='w') as settingsFile:
                    settingsFile.write(json.dumps(_settings))
                    settingsFile.close()
            except Exception as ex:
                logger.error(f'Failed write settings file at startup.\n{ex}')

            if old_location != None and old_location != real_embl_path:
                subprocess.run(['rm','-rf', f'{old_location}'])
                logger.info(f'Removed EMBL-tools from old temporary location: {old_location}')
        else:
            logger.info(f'EMBL-Tools found at {os.path.abspath(embl_path)}')
            logger.info("Setting PYTHONPATH environmental variable.")
            os.environ['PYTHONPATH']=f'{os.path.abspath(embl_path)}{os.pathsep}$PYTHONPATH'
            try:
                if not os.path.exists(_settings_file_location):
                    if not os.path.exists(_private_dir):
                        logger.info(f'Creating parent directory for settings file: {_settings_file_dir_}')                   
                        try:
                            os.makedirs(_private_dir)
                            logger.info(f'{_settings_file_dir_} created.') 
                        except Exception as ex:
                            logger.error(f'Failed to create parent directory for settings file at: {_settings_file_dir_}\n{ex}')
                    logger.info(f'Settings file not found at: {_settings_file_location}\nCreating empty settings file.')
                    with open(_settings_file_location, mode='w') as settingsFile:
                        settingsFile.write(json.dumps({}))
                        settingsFile.close()
                        
                with open(_settings_file_location, mode='r') as settingsFile:
                    settingsData = settingsFile.read()
                    _settings = json.loads(settingsData)
                    old_location = None if 'tmploc' not in _settings else _settings['tmploc']
                    settingsFile.close()
            except Exception as ex:
                logger.error(f'Failed to read settings file at startup. {ex}')

            if old_location != None and old_location != os.path.abspath(embl_path):
                subprocess.run(['rm', '-rf', f'{old_location}'])
                logger.info(f'Removed EMBL-tools from old temporary location: {old_location}')

        self.finish(json.dumps({
            'path': embl_path,
            'found': not(embl_path==None)
        }))

# /toolcheck endpoint
class ToolsChecker_handler(APIHandler):
    
    @property
    def contents_manager(self):
        '''Currently configured notebook server ContentsManager.'''
        return self.settings['contents_manager']

    @property
    def root_dir(self):
        '''Root directory to scan.'''
        return self.contents_manager.root_dir
    
    def scan_disk(self, path):
        tool_file_names = []
        try:
            for entry in os.scandir(path):
                if entry.is_file() and entry.name.split('.')[-1] == 'ipynb':
                    tool_file_names.append(entry.name)
            return tool_file_names
        except Exception as ex:
            logger.error(ex.__str__())

    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        emblTools_path = data['path']+'/notebooks'
        tools = self.scan_disk(os.path.join(self.root_dir,emblTools_path))
        self.finish(json.dumps({
            'tools':tools
        }))

# / settings endpoint
class settingsHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            data = self.get_json_body()
            emailSetting = data['email']
            outdirSetting = data['outdir']
            if not os.path.exists(_settings_file_location):
                logger.info(f'Settings file not found at: {_settings_file_location}\nCreating empty settings file.')
                if not os.path.exists(_private_dir):
                    logger.info(f'Creating parent directory for settings file: {_settings_file_dir_}')                   
                    try:
                        os.makedirs(_private_dir)
                        logger.info(f'{_settings_file_dir_} created.') 
                    except Exception as ex:
                        logger.error(f'Failed to create parent directory for settings file at: {_settings_file_dir_}\n{ex}')
                
                with open(_settings_file_location, mode='w') as settingsFile:
                    settingsFile.write(json.dumps({}))
                    settingsFile.close()

            with open(_settings_file_location, mode='r') as settingsFile:
                settingsData = settingsFile.read()
                _settings = json.loads(settingsData)
                settingsFile.close()
            _settings['email'] = emailSetting
            _settings['outdir'] = outdirSetting
            with open(_settings_file_location, mode='w') as settingsFile:
                settingsFile.write(json.dumps(_settings))
                settingsFile.close()
            self.finish(json.dumps({
                'result': True
            }))
        except Exception as ex:
            logger.error(f'Failed to save settings. {ex.__str__()}')
            self.finish(json.dumps({
                'result': False,
                'reason':  ex.__str__()
            }))

# /descriptions endpoint
class ToolDescriptionsHandler(APIHandler):

    @tornado.web.authenticated
    def get(self):
        desc_file_path = os.path.join(_location, 'toolDescriptions.json')
        descriptions = '{}'
        success = False
        error_msg = ''
        try:
            with open(desc_file_path, 'r') as descriptions_file:
                descriptions = descriptions_file.read()
                descriptions_file.close()
                success = True
        except Exception as ex:
            error_msg  = ex.__str__()
            logger.error(error_msg)
        self.finish(json.dumps({
            'success': success,
            'error_msg' : error_msg,
            'descriptions': descriptions
        }))    

def setup_handlers(web_app):
    logger.info('embl-tools-jl extension starting up.')
    host_pattern = '.*$'
    extension_url = 'embl-tools-jl'
    base_url = web_app.settings['base_url']
    startup_pattern = url_path_join(base_url, extension_url, 'startup')
    toolcheck_pattern = url_path_join(base_url, extension_url, 'toolcheck')
    saveSettings_pattern = url_path_join(base_url, extension_url, 'settings' )
    getDescriptions_pattern = url_path_join(base_url, extension_url, 'descriptions')
    handlers = [(startup_pattern, Startup_handler), (toolcheck_pattern,ToolsChecker_handler ),
                (saveSettings_pattern, settingsHandler), (getDescriptions_pattern, ToolDescriptionsHandler)]
    web_app.add_handlers(host_pattern, handlers)
    logger.info('embl-tools-jl extension started.')
