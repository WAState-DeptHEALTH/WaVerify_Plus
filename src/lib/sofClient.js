import FHIR from 'fhirclient';
import { SOF_REDIRECT_URI, SOF_RESOURCES } from './config';

export { authorize, retrieve };

const patientResourceScope = SOF_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const config = {
        // This client ID worked through 2023-04-17, and then I marked the app as ready for production. I think at that point I was assigned new prod & non-prod client ID's...
        clientId: '451709b5-ab93-4dc1-8fb1-6cd9104bee7a', // clientId is ignored at smit
        scope: `openid fhirUser launch/patient ${resourceScope} offline_access`,
        iss: '(authorization url, populated later)',
        completeInTarget: true,
        redirect_uri: SOF_REDIRECT_URI,
        target: "popup",
        completeInTarget: true
    };

function authorize(inputFhirUrl, clientId) {
    config.iss = inputFhirUrl;
    config.clientId = clientId ?? "no clientId provided";
    return FHIR.oauth2.authorize(config);
};

function requestResources(client, resourceType) {
    let endpoint = (resourceType == 'Patient' ? 'Patient/' : `${resourceType}?patient=`) + client.getPatientId();
    return client.request(endpoint, { flat: true })
        .then((result) => {
            let resourcesToPass = [];
            if (Array.isArray(result)) {
                result.forEach(resource => {
                    if (resource === undefined || resource.resourceType != resourceType) return;
                    resourcesToPass.push(resource);
                });
            } else {
                resourcesToPass.push(result);
            }
            return resourcesToPass;
        });
}

async function retrieve() {
    try {
        let client = await FHIR.oauth2.ready();
        if (client.getPatientId()) {
            // Establish resource display methods
            let resources = await Promise.all(SOF_RESOURCES.map((resourceType) => {
                return requestResources(client, resourceType);
            }));
            return [].concat(...resources);
        }
        throw Error("No patient id found");
    } catch(e) {
        console.error(e);
    }
}

// Utility function to validate a URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}