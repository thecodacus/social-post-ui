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
  feeds: BehaviorSubject<{ owner: string, content: string }[]> = new BehaviorSubject<{ owner: string, content: string }[]>([])
  provider: ethers.providers.Web3Provider | null = null;
  contract: ethers.Contract | null = null;
  postField: string = "";
  async connectWallet() {
    // A Web3Provider wraps a standard Web3 provider, which is
    // what MetaMask injects as window.ethereum into each page
    const provider = new ethers.providers.Web3Provider((window as any).ethereum)

    // MetaMask requires requesting permission to connect users accounts
    await provider.send("eth_requestAccounts", []);

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
    let totalCountBig: BigNumber = await this.contract['totalSupply']();
    let totalcount = totalCountBig.toNumber();
    let posts = []
    for (let i = totalcount - 1; i > totalcount - 10 && i >= 0; i--) {
      let owner = await this.contract['ownerOf'](i);
      let content = await this.contract['getContentByTokenId'](i);
      posts.push({
        owner,
        content
      })
    }
    return posts
  }
}
