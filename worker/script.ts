import { PiercingGateway } from "@sferg989/fergfo-piercing-library";

export interface Env {
  APP_BASE_URL: string;
  ISOLATE_FRAGMENTS: boolean;
}

const gateway = new PiercingGateway<Env>({
  getLegacyAppBaseUrl(env) {
    return env.APP_BASE_URL;
  },
  isolateFragments(env) {
    return true;
  },
  shouldPiercingBeEnabled(request: Request) {
    
    return true;
  },
  async generateMessageBusState(requestMessageBusState, request) {
    

    return requestMessageBusState;
  },
});
gateway.registerFragment({
  fragmentId: "header",
  framework: "react",
  prePiercingStyles: `
    :not(piercing-fragment-outlet) > piercing-fragment-host {
      position: absolute;
      top: 0rem;
      left: 1rem;
      right: 1rem;
    }

    @media (max-width: 45rem) {
      :not(piercing-fragment-outlet) > piercing-fragment-host {
        top: 0rem;
      }
    }
    @media (max-width: 35rem) {
      :not(piercing-fragment-outlet) > piercing-fragment-host {
        top: 0rem;
      }
    }
    @media (max-width: 25rem) {
      :not(piercing-fragment-outlet) > piercing-fragment-host {
        top: 0rem;
      }
    }
    `,
  async shouldBeIncluded(request: Request) {
    return true;
  },
});
console.log("this worked");

export default gateway;
