import json

from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join
import tornado
import os
import logging

class Startup_handler(APIHandler):
    logging.basicConfig(filename='./debug.log',filemode='w', format='%(levelname)s:%(message)s', level=logging.DEBUG)
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
                    if entry.name == 'EMBL-Tools':
                        return os.path.relpath(os.path.dirname(entry.path), self.root_dir)+'/'+entry.name 
                    subdir_scan=self.scan_disk(entry.path)
                    if subdir_scan:
                        return subdir_scan
            return None
        except PermissionError:
            logging.warning('Permission denied: '+ path)
        except OSError as error:
            logging.warning('OSError code: %i at %s ', error.errno, path)

    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        embl_path = self.scan_disk(self.root_dir)
        self.finish(json.dumps({
            'path': embl_path,
            'found': not(embl_path==None)
        }))

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
        for entry in os.scandir(path):
            if entry.is_file() and entry.name.split('.')[-1] == 'ipynb':
                tool_file_names.append(entry.name)
        return tool_file_names

    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        emblTools_path = data['path']
        tools = self.scan_disk(os.path.join(self.root_dir,emblTools_path))
        self.finish(json.dumps({
            'tools':tools
        }))

class settingsHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            data = self.get_json_body()
            emblTools_path = data['path']
            emailSetting = data['email']
            outdirSetting = data['outdir']  
            settingsFilePath = os.path.join(emblTools_path, 'settings.json')
            with open(settingsFilePath, mode='w') as settingsFile:
                settingsFile.write(json.dumps({
                    'email':emailSetting,
                    'outdir':outdirSetting
                }))
                settingsFile.close
            
            self.finish(json.dumps({
                'result': True
            }))
        except Exception as exception:
            self.finish(json.dumps({
                'result': False,
                'reason': str(type(exception)+' '+ exception)
            }))

def setup_handlers(web_app):
    host_pattern = '.*$'
    extension_url = 'embl-tools-jl'
    base_url = web_app.settings['base_url']
    startup_pattern = url_path_join(base_url, extension_url, 'startup')
    toolcheck_pattern = url_path_join(base_url, extension_url, 'toolcheck')
    saveSettings_pattern = url_path_join(base_url, extension_url, 'savesettings' )
    handlers = [(startup_pattern, Startup_handler), (toolcheck_pattern,ToolsChecker_handler ),
                (saveSettings_pattern, settingsHandler)]
    web_app.add_handlers(host_pattern, handlers)
