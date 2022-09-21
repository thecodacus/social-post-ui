import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BigNumber, ethers, Transaction } from "ethers";
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
  postPending: BehaviorSubject<boolean> = new BehaviorSubject(false);
  isCorrectChain: boolean = true;
  chainName: string = ""
  constructor() {
    let ethereum = (window as any).ethereum
    if (ethereum == null) return;
    this.chainName = environment.chainName;

    this.provider = new ethers.providers.Web3Provider((window as any).ethereum, "any")
    Promise.all([this.provider.getNetwork(), this.provider.listAccounts()])
      .then(([network, accounts]) => {
        console.log(network, accounts);
        if (network.chainId != environment.chainId) {
          this.isCorrectChain = false;
          return;
        }
        this.isCorrectChain = true;
        if (accounts.length > 0) {
          this.walletAddress.next({
            address: accounts[0]
          })
          this.connectWallet();
        }
      })
    // network change handler
    this.provider.on("network", (newNetwork, oldNetwork) => {
      // When a Provider makes its initial connection, it emits a "network"
      // event with a null oldNetwork along with the newNetwork. So, if the
      // oldNetwork exists, it represents a changing network
      if (oldNetwork) {
        window.location.reload();
      }
    });
    (window as any).ethereum.on("accountsChanged", (accounts: any) => {
      console.log(accounts);
      if (accounts[0]) this.walletAddress.next({ address: accounts[0] })
      else {
        this.walletAddress.next({ address: null })
        this.contract = null;
      }
      /* do what you want here */
    })
  }
  async connectWallet() {
    // A Web3Provider wraps a standard Web3 provider, which is
    // what MetaMask injects as window.ethereum into each page
    if (this.provider == null) {
      this.provider = new ethers.providers.Web3Provider((window as any).ethereum, "any");
    }

    // MetaMask requires requesting permission to connect users accounts
    let addresses = await this.provider.send("eth_requestAccounts", []);
    if (addresses[0]) this.walletAddress.next({ address: addresses[0] })
    let network = await this.provider.getNetwork();
    if (network.chainId != environment.chainId) {
      this.isCorrectChain = false;
      return;
    }
    this.isCorrectChain = true;

    // The MetaMask plugin also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, you need the account signer...
    const signer = this.provider.getSigner()

    this.contract = new ethers.Contract(environment.contractAddress, environment.abi, signer)
    this.feeds.next(await this.getAllPosts())
    this.contract.on('NewPost', (owner, content) => {
      this.loadedPosts = [{
        owner,
        content,
        ens: null
      }, ...this.loadedPosts]
      this.feeds.next(this.loadedPosts)
    })
  }
  async post() {
    if (this.contract == null) return [];
    if (this.postField == "" || this.postField == null) return;
    try {
      let transaction = await this.contract['post'](this.postField);
      this.postPending.next(true);
      this.postField = ""
      await transaction.wait();

      this.postPending.next(false);
    }
    catch (err: any) {
      console.log(err);
      this.postPending.next(false)
    }
    return
  }
  async getAllPosts() {
    if (this.contract == null) return [];
    this.loading.next(true);
    let totalCountBig: BigNumber = await this.contract['totalSupply']();
    let totalcount = totalCountBig.toNumber();
    //offset clunter to load next 10
    totalcount = totalcount - this.loadedCounter;
    for (let i = totalcount - 1; i >= totalcount - 2 && i >= 0; i--) {
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
  getShortenedAddress(address: string) {
    return (`${address.substring(0, 6)}...${address.substring(address.length - 5)}`)
  }
}
