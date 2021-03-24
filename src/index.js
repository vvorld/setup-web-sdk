const defaultOptions = {
  metadata: {},
  containerId: 'getid-component',
  profile: [],
  apiUrl: 'https://ar.dev.getid.dev',
  sdkKey: '',
  flowName: 'sdk-v6',
};
const defaultCallbacks = {
  onComplete(dataOnComplete) {
    console.log('onComplete', dataOnComplete);
  },
  onFail(error) {
    console.log('onFail', error);
  },
  onVerificationComplete(data) {
    console.log('onVerificationComplete', data);
  },
  acceptableDocuments: (supportedCountry, supportedDocs) => {
    if (supportedCountry.length > 0 && supportedDocs.length > 0) {
      return (supportedDocuments) => supportedDocuments
        .filter(({ country, documentTypes }) => supportedCountry.includes(country.toLowerCase())
        && supportedDocs.includes(documentTypes));
    }
    if (supportedCountry.length > 0 && supportedDocs.length === 0) {
      return (supportedDocuments) => supportedDocuments
        .filter(({ country }) => supportedCountry.includes(country.toLowerCase()));
    }
    return (supportedDocuments) => supportedDocuments
      .filter(({ documentTypes }) => supportedDocs.includes(documentTypes));
  },
};
const enrichBySpecialKey = {
  mode: (config, node) => (node.checked ? { ...config, mode: 'popup' } : config),
  profile: (config) => config,
  onComplete: (config, node) => (
    node.checked ? { ...config, onComplete: defaultCallbacks.onComplete } : config
  ),
  onFail: (config, { checked }) => (
    checked ? { ...config, onFail: defaultCallbacks.onFail } : config
  ),
  onVerificationComplete: (config, { checked }) => (
    checked ? { ...config, onVerificationComplete: defaultCallbacks.onVerificationComplete }
      : config
  ),
};
const getMetadataFromForm = (formNodes) => {
  const externalId = formNodes.find(({ id }) => id === 'externalId');
  const labelKey = formNodes.find(({ id }) => id === 'labelKey');
  const labelValue = formNodes.find(({ id }) => id === 'labelValue');
  const result = {};
  if (externalId) result.externalId = externalId.value;
  if (labelKey && labelValue) result.labels = { [labelKey.value]: labelValue.value };
  return result;
};
const getProfileFromForm = (formNodes) => {
  const profileNode = formNodes.find(({ id }) => id === 'profile');
  if (!profileNode.checked) {
    return [];
  }
  return formNodes.filter(({ name }) => name.startsWith('profile_')).map(({ name, value }) => {
    const category = name.replace(/profile_/, '');
    return { category, value };
  });
};
const patchConfigAcceptableDocuments = (config, formNodes) => {
  const supportedCountry = formNodes.reduce((acc, node) => {
    if (!node.id.startsWith('supportedCountry') || !node.checked) return acc;
    const country = node.id.replace('supportedCountry_', '');
    return [...acc, country];
  }, []);
  const supportedDocs = formNodes.reduce((acc, node) => {
    if (!node.id.startsWith('supportedDocs') || !node.checked) return acc;
    const docType = node.id.replace('supportedDocs_', '').replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return [...acc, docType];
  }, []);
  if (supportedCountry.length === 0 && supportedDocs.length === 0) return config;
  return {
    ...config,
    acceptableDocuments: defaultCallbacks.acceptableDocuments(supportedCountry, supportedDocs),
  };
};
const configKeys = new Set([
  'containerId', 'locale', 'apiUrl', 'sdkKey', 'flowName', 'customerId', 'jwt', 'injectCSS', 'styles',
]);
const loadSdkScript = (sdkVersion, cb) => {
  const script = document.createElement('script');
  script.src = `https://cdn.getid.cloud/sdk/getid-web-sdk-${sdkVersion}.min.js`;
  script.onerror = (err) => {
    console.error(err);
    document.querySelector('#sdkVersion').classList.add('is-invalid');
  };
  document.body.appendChild(script);
  script.onload = () => {
    document.querySelector('#sdkVersion').classList.remove('is-invalid');
    cb().catch(console.error);
  };
};
document.querySelector('#form-setting').addEventListener('submit', (event) => {
  event.preventDefault();
  const { target } = event;
  const formResult = [...target].filter(({ value }) => value);
  const config = formResult.reduce((acc, node) => {
    if (configKeys.has(node.id) && node.value) {
      return { ...acc, [node.id]: node.value };
    }
    if (node.id in enrichBySpecialKey) {
      return enrichBySpecialKey[node.id](acc, node);
    }
    return acc;
  }, defaultOptions);
  const metadata = getMetadataFromForm(formResult);
  const profile = getProfileFromForm(formResult);
  const initConfig = { ...patchConfigAcceptableDocuments(config, formResult), metadata, profile };
  console.log('initConfig', initConfig);
  const initCallback = () => window.getidWebSdk.init(initConfig);
  loadSdkScript([...formResult].find(({ id }) => id === 'sdkVersion')?.value || 'v6', initCallback);
});

const profileCheckbox = document.querySelector('#profile');
const formsProfile = document.querySelectorAll('input[name^="profile"][type="text"]');
profileCheckbox.addEventListener('change', ({ target }) => {
  formsProfile.forEach((el) => {
    // eslint-disable-next-line no-param-reassign
    el.disabled = !target.checked;
  });
});
$('.checkbox-menu').on('change', "input[type='checkbox']", function () {
  $(this).closest('li').toggleClass('active', this.checked);
});
$(document).on('click', '.allow-focus', (e) => {
  e.stopPropagation();
});
