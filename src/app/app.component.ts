import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BigNumber, ethers } from "ethers";
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'social-post-ui';
  feeds: BehaviorSubject<{ owner: string, ens: string | null, content: string }[]> = new BehaviorSubject<{ owner: string, ens: string | null, content: string }[]>([])
  walletAddress: BehaviorSubject<{ address: string | null }> = new BehaviorSubject<{ address: string | null }>({ address: null })
  provider: ethers.providers.Web3Provider | null = null;
  contract: ethers.Contract | null = null;
  postField: string = "";
  loadedCounter: number = 0;
  loadedPosts: { owner: string, ens: string | null, content: string }[] = []
  loading: BehaviorSubject<boolean> = new BehaviorSubject(false);
  loaded: BehaviorSubject<boolean> = new BehaviorSubject(false);
  constructor() {
    this.provider = new ethers.providers.Web3Provider((window as any).ethereum)
    const signer = this.provider.getSigner()
  }
  async connectWallet() {
    // A Web3Provider wraps a standard Web3 provider, which is
    // what MetaMask injects as window.ethereum into each page
    const provider = new ethers.providers.Web3Provider((window as any).ethereum)

    // MetaMask requires requesting permission to connect users accounts
    let addresses = await provider.send("eth_requestAccounts", []);
    if (addresses[0]) this.walletAddress.next({ address: addresses[0] })

    // The MetaMask plugin also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, you need the account signer...
    const signer = provider.getSigner()

    this.contract = new ethers.Contract(environment.contractAddress, environment.abi, signer)
    this.feeds.next(await this.getAllPosts())

  }
  async post() {
    if (this.contract == null) return [];
    if (this.postField == "" || this.postField == null) return;
    await this.contract['post'](this.postField);
    return
  }

  async getAllPosts() {
    if (this.contract == null) return [];
    this.loading.next(true);
    let totalCountBig: BigNumber = await this.contract['totalSupply']();
    let totalcount = totalCountBig.toNumber();
    //offset clunter to load next 10
    totalcount = totalcount - this.loadedCounter;
    for (let i = totalcount - 1; i >= totalcount - 10 && i >= 0; i--) {
      let owner = await this.contract['ownerOf'](i);
      let content = await this.contract['getContentByTokenId'](i);
      let ens = null;
      if (this.provider) ens = await this.provider.lookupAddress(owner).catch(e => null);
      this.loadedCounter += 1;
      this.loadedPosts.push({
        owner,
        ens,
        content
      })
    }
    this.loading.next(false);
    this.loaded.next(true);
    return this.loadedPosts
  }
}
