const fs = require('fs');
const path = require('path');

const manifestPath = path.resolve(__dirname, '../dist/manifest.json');

try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // web_accessible_resources v3 format fix
    if (manifest.web_accessible_resources) {
        manifest.web_accessible_resources = manifest.web_accessible_resources.map(resource => {
            if (typeof resource === 'string') {
                return {
                    resources: [resource],
                    matches: ['<all_urls>']
                };
            }
            return resource;
        });
    }

    // Remove $schema if exists
    delete manifest.$schema;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest fixed!');
} catch (error) {
    console.error('Error fixing manifest:', error);
    process.exit(1);
}
